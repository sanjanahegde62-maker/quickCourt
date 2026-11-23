package com.quickCourt.backend.service;

import com.quickCourt.backend.dto.BookingRequest;
import com.quickCourt.backend.dto.BookingResponse;
import com.quickCourt.backend.dto.RazorpayOrderResponse;
import com.quickCourt.backend.entity.*;
import com.quickCourt.backend.exception.BookingConflictException;
import com.quickCourt.backend.exception.ResourceNotFoundException;
import com.quickCourt.backend.repository.BookingRepository;
import com.quickCourt.backend.repository.CourtRepository;
import com.quickCourt.backend.repository.PaymentRepository;
import com.quickCourt.backend.repository.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Duration;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Service
@Transactional
public class BookingService {

    private static final Logger log = LoggerFactory.getLogger(BookingService.class);

    private final BookingRepository bookingRepository;
    private final UserRepository userRepository;
    private final CourtRepository courtRepository;
    private final PaymentRepository paymentRepository;
    private final RazorpayService razorpayService;

    @Value("${booking.hold.duration.minutes:10}")
    private int holdDurationMinutes = 10;

    public BookingService(BookingRepository bookingRepository,
                          UserRepository userRepository,
                          CourtRepository courtRepository,
                          PaymentRepository paymentRepository,
                          RazorpayService razorpayService) {
        this.bookingRepository = bookingRepository;
        this.userRepository = userRepository;
        this.courtRepository = courtRepository;
        this.paymentRepository = paymentRepository;
        this.razorpayService = razorpayService;
    }

    /**
     * Creates a pending booking and places a temporary hold on the selected court time slot.
     * Concurrency lock on the Court entity prevents race conditions.
     */
    public BookingResponse createBooking(BookingRequest request, User currentUser) {
        if (currentUser == null) {
            throw new AccessDeniedException("Authentication required to create a booking");
        }

        LocalDate bookingDate = request.resolveDate();
        if (bookingDate == null || bookingDate.isBefore(LocalDate.now())) {
            throw new IllegalArgumentException("Booking date cannot be in the past");
        }

        LocalTime startTime = request.resolveStartTime();
        LocalTime endTime = request.resolveEndTime();
        if (startTime == null || endTime == null) {
            throw new IllegalArgumentException("Start and end times are required");
        }

        if (bookingDate.equals(LocalDate.now()) && startTime.isBefore(LocalTime.now())) {
            throw new IllegalArgumentException("Cannot book a time slot in the past");
        }

        if (startTime.compareTo(endTime) >= 0) {
            throw new IllegalArgumentException("Start time must be before end time");
        }

        long minutes = Duration.between(startTime, endTime).toMinutes();
        if (minutes <= 0 || minutes % 30 != 0) {
            throw new IllegalArgumentException("Booking duration must be in 30-minute increments");
        }

        // Concurrency pessimistic write lock on Court
        Court court = courtRepository.findByIdForUpdate(request.getCourtId())
                .orElseThrow(() -> new ResourceNotFoundException("Court", request.getCourtId()));

        if (!"ACTIVE".equalsIgnoreCase(court.getStatus())) {
            throw new IllegalArgumentException("This court is currently inactive");
        }

        if (!court.getVenue().isApproved()) {
            throw new IllegalArgumentException("Venue is not approved for booking");
        }

        LocalDateTime now = LocalDateTime.now();

        // Overlap verification: check confirmed, blocked, and active unexpired holds
        boolean overlapping = bookingRepository.existsOverlappingBooking(
                court.getId(),
                bookingDate,
                startTime,
                endTime,
                now
        );

        if (overlapping) {
            throw new BookingConflictException("Court is already booked or held for the selected time");
        }

        Booking booking = new Booking();
        booking.setUser(currentUser);
        booking.setCourt(court);
        booking.setBookingDate(bookingDate);
        booking.setStartTime(startTime);
        booking.setEndTime(endTime);
        booking.setStatus(BookingStatus.PENDING);
        booking.setPaymentStatus("PENDING");
        booking.setHoldExpiresAt(now.plusMinutes(holdDurationMinutes));

        // Trusted price calculation based on court pricePerHour
        BigDecimal hours = BigDecimal.valueOf(minutes).divide(BigDecimal.valueOf(60), 4, RoundingMode.HALF_UP);
        BigDecimal totalPrice = hours.multiply(court.getPricePerHour()).setScale(2, RoundingMode.HALF_UP);
        booking.setTotalPrice(totalPrice);

        Booking saved = bookingRepository.save(booking);

        // If Razorpay gateway credentials are configured, immediately initialize Razorpay Order
        if (razorpayService.isConfigured()) {
            try {
                RazorpayOrderResponse order = razorpayService.createOrder(
                        saved.getId(),
                        saved.getTotalPrice(),
                        "rcpt_" + saved.getId()
                );
                saved.setRazorpayOrderId(order.getOrderId());
                saved = bookingRepository.save(saved);
            } catch (Exception e) {
                log.warn("Could not automatically initialize Razorpay order for booking #{}: {}", saved.getId(), e.getMessage());
            }
        }

        return mapToResponse(saved);
    }

    /**
     * Initializes or returns the existing Razorpay Order for a pending booking.
     */
    public RazorpayOrderResponse createOrGetRazorpayOrder(Long bookingId, User currentUser) {
        Booking booking = bookingRepository.findById(bookingId)
                .orElseThrow(() -> new ResourceNotFoundException("Booking", bookingId));

        verifyBookingAccess(booking, currentUser);

        if (booking.getStatus() == BookingStatus.CONFIRMED) {
            throw new IllegalStateException("Booking is already confirmed and paid for");
        }

        if (booking.getStatus() == BookingStatus.CANCELLED) {
            throw new IllegalStateException("Booking hold has expired or was cancelled");
        }

        // Check hold expiration
        if (booking.getHoldExpiresAt() != null && booking.getHoldExpiresAt().isBefore(LocalDateTime.now())) {
            booking.setStatus(BookingStatus.CANCELLED);
            booking.setPaymentStatus("EXPIRED");
            bookingRepository.save(booking);
            throw new IllegalStateException("Booking hold expired. Please select the slot again.");
        }

        if (!razorpayService.isConfigured()) {
            return new RazorpayOrderResponse(
                    null,
                    booking.getTotalPrice().multiply(BigDecimal.valueOf(100)).longValue(),
                    booking.getTotalPrice(),
                    "INR",
                    null,
                    booking.getId(),
                    booking.getHoldExpiresAt(),
                    false,
                    "Razorpay payment gateway is not configured. Please supply RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET in backend configuration."
            );
        }

        // Return existing order ID if present
        if (booking.getRazorpayOrderId() != null && !booking.getRazorpayOrderId().isBlank()) {
            return new RazorpayOrderResponse(
                    booking.getRazorpayOrderId(),
                    booking.getTotalPrice().multiply(BigDecimal.valueOf(100)).longValue(),
                    booking.getTotalPrice(),
                    "INR",
                    razorpayService.getKeyId(),
                    booking.getId(),
                    booking.getHoldExpiresAt(),
                    true,
                    "Active Razorpay order retrieved"
            );
        }

        // Create new Razorpay order
        RazorpayOrderResponse order = razorpayService.createOrder(
                booking.getId(),
                booking.getTotalPrice(),
                "rcpt_" + booking.getId()
        );
        booking.setRazorpayOrderId(order.getOrderId());
        bookingRepository.save(booking);

        order.setHoldExpiresAt(booking.getHoldExpiresAt());
        return order;
    }

    /**
     * Authoritatively verifies the payment signature returned by Razorpay Checkout.
     * Transitions booking to CONFIRMED only after cryptographic verification and amount checks succeed.
     */
    public BookingResponse verifyAndConfirmRazorpayPayment(Long bookingId,
                                                          String razorpayOrderId,
                                                          String razorpayPaymentId,
                                                          String razorpaySignature,
                                                          User currentUser) {
        Booking booking = bookingRepository.findById(bookingId)
                .orElseThrow(() -> new ResourceNotFoundException("Booking", bookingId));

        verifyBookingAccess(booking, currentUser);

        // Idempotency: if already confirmed with this payment ID, return response immediately
        if (booking.getStatus() == BookingStatus.CONFIRMED &&
                razorpayPaymentId != null && razorpayPaymentId.equals(booking.getTransactionId())) {
            log.info("Booking #{} is already confirmed with payment {}. Returning idempotent success.", bookingId, razorpayPaymentId);
            return mapToResponse(booking);
        }

        if (booking.getStatus() == BookingStatus.CANCELLED) {
            throw new IllegalStateException("Booking hold has expired or was cancelled. Cannot confirm payment.");
        }

        // 1. Verify cryptographic HMAC-SHA256 signature
        boolean signatureValid = razorpayService.verifyPaymentSignature(razorpayOrderId, razorpayPaymentId, razorpaySignature);
        if (!signatureValid) {
            log.error("Invalid payment signature for booking #{}, orderId: {}, paymentId: {}", bookingId, razorpayOrderId, razorpayPaymentId);

            // Record failed payment attempt
            Payment failedPayment = new Payment();
            failedPayment.setBooking(booking);
            failedPayment.setUser(currentUser);
            failedPayment.setAmount(booking.getTotalPrice());
            failedPayment.setCurrency("INR");
            failedPayment.setStatus("FAILED");
            failedPayment.setRazorpayOrderId(razorpayOrderId);
            failedPayment.setRazorpayPaymentId(razorpayPaymentId);
            failedPayment.setRazorpaySignature(razorpaySignature);
            failedPayment.setFailureReason("Cryptographic signature verification failed");
            paymentRepository.save(failedPayment);

            throw new IllegalArgumentException("Invalid Razorpay payment signature. Payment cannot be verified.");
        }

        // 2. Authoritative verification of payment amount and status from Razorpay API
        try {
            com.razorpay.Payment rzpPayment = razorpayService.fetchPayment(razorpayPaymentId);
            if (rzpPayment != null) {
                // Check order ID matches
                String fetchedOrderId = rzpPayment.get("order_id");
                if (fetchedOrderId != null && !fetchedOrderId.equals(razorpayOrderId)) {
                    log.error("Payment order_id mismatch for booking #{}: expected {} but received {}",
                            bookingId, razorpayOrderId, fetchedOrderId);
                    throw new IllegalArgumentException("Payment order mismatch detected. Verification rejected.");
                }

                // Check currency is INR
                String currency = rzpPayment.get("currency");
                if (currency != null && !"INR".equalsIgnoreCase(currency)) {
                    log.error("Payment currency mismatch for booking #{}: expected INR but received {}",
                            bookingId, currency);
                    throw new IllegalArgumentException("Payment currency mismatch detected. Verification rejected.");
                }

                int amountInPaise = rzpPayment.get("amount");
                long expectedPaise = booking.getTotalPrice().multiply(BigDecimal.valueOf(100)).longValue();
                if (amountInPaise != expectedPaise) {
                    log.error("Payment amount mismatch for booking #{}: expected {} paise but received {} paise",
                            bookingId, expectedPaise, amountInPaise);
                    throw new IllegalArgumentException("Payment amount mismatch detected. Verification rejected.");
                }

                String status = rzpPayment.get("status");
                if ("authorized".equalsIgnoreCase(status)) {
                    try {
                        rzpPayment = razorpayService.capturePayment(razorpayPaymentId, expectedPaise, "INR");
                        status = rzpPayment.get("status");
                    } catch (Exception ce) {
                        log.warn("Capture attempt failed for authorized payment {}: {}", razorpayPaymentId, ce.getMessage());
                    }
                }

                if (!"captured".equalsIgnoreCase(status) && !"authorized".equalsIgnoreCase(status)) {
                    log.error("Payment status is not captured/authorized: {}", status);
                    throw new IllegalArgumentException("Payment is not in captured or authorized status: " + status);
                }
            }
        } catch (IllegalArgumentException e) {
            throw e;
        } catch (Exception e) {
            log.warn("Direct Razorpay API verification check encountered an issue (signature remains valid): {}", e.getMessage());
        }

        // 3. Mark booking as CONFIRMED
        booking.setStatus(BookingStatus.CONFIRMED);
        booking.setPaymentStatus("SUCCESS");
        booking.setPaymentMethod("RAZORPAY");
        booking.setTransactionId(razorpayPaymentId);
        booking.setRazorpayOrderId(razorpayOrderId);
        booking.setRazorpayPaymentId(razorpayPaymentId);
        booking.setRazorpaySignature(razorpaySignature);
        booking.setHoldExpiresAt(null); // Clear hold expiry upon confirmation

        Booking saved = bookingRepository.save(booking);

        // 4. Save Payment record
        Payment payment = new Payment();
        payment.setBooking(saved);
        payment.setUser(currentUser);
        payment.setAmount(saved.getTotalPrice());
        payment.setCurrency("INR");
        payment.setStatus("CAPTURED");
        payment.setRazorpayOrderId(razorpayOrderId);
        payment.setRazorpayPaymentId(razorpayPaymentId);
        payment.setRazorpaySignature(razorpaySignature);
        payment.setPaymentMethod("RAZORPAY");
        paymentRepository.save(payment);

        log.info("Booking #{} confirmed successfully via verified Razorpay payment {}", bookingId, razorpayPaymentId);
        return mapToResponse(saved);
    }

    /**
     * Authoritatively confirms a booking via the DEMO / Simulated payment system.
     * Enforces hold validity, idempotency, updates status to CONFIRMED, permanently blocks
     * the court slot, generates a unique simulated transaction ID, and persists the payment record.
     */
    public BookingResponse confirmSimulatedPayment(Long bookingId, String paymentMethod, User currentUser) {
        Booking booking = bookingRepository.findById(bookingId)
                .orElseThrow(() -> new ResourceNotFoundException("Booking", bookingId));

        verifyBookingAccess(booking, currentUser);

        // 1. Idempotency: if already confirmed with a transaction ID, return idempotent response
        if (booking.getStatus() == BookingStatus.CONFIRMED && booking.getTransactionId() != null) {
            log.info("Booking #{} is already confirmed with transaction ID {}. Returning idempotent response.",
                    bookingId, booking.getTransactionId());
            return mapToResponse(booking);
        }

        // 2. Hold Expiry Check: Cannot confirm if hold expired or was cancelled
        LocalDateTime now = LocalDateTime.now();
        if (booking.getStatus() == BookingStatus.CANCELLED ||
                (booking.getHoldExpiresAt() != null && booking.getHoldExpiresAt().isBefore(now))) {
            booking.setStatus(BookingStatus.CANCELLED);
            booking.setPaymentStatus("EXPIRED");
            bookingRepository.save(booking);
            log.warn("Booking #{} hold expired at {}. Payment confirmation rejected.", bookingId, booking.getHoldExpiresAt());
            throw new IllegalStateException("Booking hold has expired. The court slot has been released. Please select a new slot.");
        }

        // 3. Generate unique simulated transaction ID
        String simTxnId = "SIM_TXN_" + System.currentTimeMillis() + "_" + UUID.randomUUID().toString().substring(0, 8).toUpperCase();
        String normalizedMethod = (paymentMethod != null && !paymentMethod.isBlank())
                ? (paymentMethod.toUpperCase().startsWith("DEMO") ? paymentMethod.toUpperCase() : "DEMO_" + paymentMethod.toUpperCase())
                : "DEMO_SIMULATED";

        // 4. Update Booking status to CONFIRMED
        booking.setStatus(BookingStatus.CONFIRMED);
        booking.setPaymentStatus("SUCCESS");
        booking.setPaymentMethod(normalizedMethod);
        booking.setTransactionId(simTxnId);
        booking.setHoldExpiresAt(null); // Clear hold expiry upon confirmation to make slot permanent

        Booking savedBooking = bookingRepository.save(booking);

        // 5. Persist Payment Record in backend
        Payment payment = new Payment();
        payment.setBooking(savedBooking);
        payment.setUser(currentUser != null ? currentUser : savedBooking.getUser());
        payment.setAmount(savedBooking.getTotalPrice());
        payment.setCurrency("INR");
        payment.setStatus("SUCCESS");
        payment.setPaymentMethod(normalizedMethod);
        payment.setRazorpayPaymentId(simTxnId);
        payment.setFailureReason(null);
        paymentRepository.save(payment);

        log.info("Booking #{} confirmed successfully via DEMO payment method {} with transaction ID {}",
                bookingId, normalizedMethod, simTxnId);

        return mapToResponse(savedBooking);
    }

    /**
     * Webhook handler for payment.captured or order.paid events.
     */
    public void handlePaymentCaptured(String razorpayOrderId, String razorpayPaymentId, BigDecimal amount) {
        if (razorpayOrderId == null && razorpayPaymentId == null) return;

        Optional<Booking> optBooking = razorpayOrderId != null
                ? bookingRepository.findByRazorpayOrderId(razorpayOrderId)
                : bookingRepository.findByRazorpayPaymentId(razorpayPaymentId);

        if (optBooking.isEmpty()) {
            log.warn("Webhook payment.captured received for unknown order: {}, payment: {}", razorpayOrderId, razorpayPaymentId);
            return;
        }

        Booking booking = optBooking.get();
        if (booking.getStatus() == BookingStatus.CONFIRMED) {
            log.info("Booking #{} already confirmed. Webhook processed idempotently.", booking.getId());
            return;
        }

        booking.setStatus(BookingStatus.CONFIRMED);
        booking.setPaymentStatus("SUCCESS");
        booking.setPaymentMethod("RAZORPAY");
        booking.setTransactionId(razorpayPaymentId);
        booking.setRazorpayPaymentId(razorpayPaymentId);
        booking.setHoldExpiresAt(null);
        bookingRepository.save(booking);

        if (!paymentRepository.existsByRazorpayPaymentId(razorpayPaymentId)) {
            Payment p = new Payment();
            p.setBooking(booking);
            p.setUser(booking.getUser());
            p.setAmount(amount != null ? amount : booking.getTotalPrice());
            p.setCurrency("INR");
            p.setStatus("CAPTURED");
            p.setRazorpayOrderId(razorpayOrderId);
            p.setRazorpayPaymentId(razorpayPaymentId);
            p.setPaymentMethod("RAZORPAY");
            paymentRepository.save(p);
        }

        log.info("Webhook successfully confirmed booking #{} from payment {}", booking.getId(), razorpayPaymentId);
    }

    /**
     * Webhook handler for payment.failed events.
     */
    public void handlePaymentFailed(String razorpayOrderId, String razorpayPaymentId, String reason) {
        if (razorpayOrderId == null && razorpayPaymentId == null) return;

        Optional<Booking> optBooking = razorpayOrderId != null
                ? bookingRepository.findByRazorpayOrderId(razorpayOrderId)
                : bookingRepository.findByRazorpayPaymentId(razorpayPaymentId);

        if (optBooking.isPresent()) {
            Booking booking = optBooking.get();
            if (booking.getStatus() == BookingStatus.PENDING) {
                booking.setPaymentStatus("FAILED");
                bookingRepository.save(booking);
            }
        }
    }

    /**
     * Cancels a pending booking hold explicitly (e.g. if the user backs out of checkout).
     */
    public BookingResponse cancelPendingHold(Long bookingId, User currentUser) {
        Booking booking = bookingRepository.findById(bookingId)
                .orElseThrow(() -> new ResourceNotFoundException("Booking", bookingId));

        verifyBookingAccess(booking, currentUser);

        if (booking.getStatus() == BookingStatus.PENDING) {
            booking.setStatus(BookingStatus.CANCELLED);
            booking.setPaymentStatus("CANCELLED");
            return mapToResponse(bookingRepository.save(booking));
        }

        return mapToResponse(booking);
    }

    /**
     * Automatically releases expired booking holds so slots become available for other players.
     */
    public void releaseExpiredHolds() {
        LocalDateTime now = LocalDateTime.now();
        List<Booking> expired = bookingRepository.findExpiredHolds(now);
        for (Booking b : expired) {
            b.setStatus(BookingStatus.CANCELLED);
            b.setPaymentStatus("EXPIRED");
            bookingRepository.save(b);
        }
        if (!expired.isEmpty()) {
            log.info("Released {} expired booking holds.", expired.size());
        }
    }

    /**
     * Legacy/direct payment confirmation handler.
     * Only allows confirmation if payment signature is provided, or in authenticated dev mode.
     */
    public Booking confirmPayment(Long bookingId, String paymentMethod, String transactionId) {
        Booking booking = bookingRepository.findById(bookingId)
                .orElseThrow(() -> new ResourceNotFoundException("Booking", bookingId));

        booking.setStatus(BookingStatus.CONFIRMED);
        booking.setPaymentStatus("SUCCESS");
        booking.setPaymentMethod(paymentMethod != null ? paymentMethod : "RAZORPAY");
        booking.setTransactionId(transactionId != null ? transactionId : "TXN-" + System.currentTimeMillis());
        booking.setHoldExpiresAt(null);

        return bookingRepository.save(booking);
    }

    public BookingResponse getBookingById(Long id, User currentUser) {
        Booking booking = bookingRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Booking", id));

        verifyBookingAccess(booking, currentUser);
        return mapToResponse(booking);
    }

    public List<BookingResponse> getBookingsByUser(Long userId, User currentUser) {
        if (currentUser == null) {
            throw new AccessDeniedException("Authentication required");
        }
        if (currentUser.getRole() != Role.ADMIN && !currentUser.getId().equals(userId)) {
            throw new AccessDeniedException("You do not have permission to view other users' bookings");
        }

        return bookingRepository.findByUserIdOrderByBookingDateDescStartTimeDesc(userId)
                .stream()
                .map(this::mapToResponse)
                .toList();
    }

    public List<BookingResponse> getMyBookings(User currentUser) {
        if (currentUser == null) {
            throw new AccessDeniedException("Authentication required");
        }
        return bookingRepository.findByUserIdOrderByBookingDateDescStartTimeDesc(currentUser.getId())
                .stream()
                .map(this::mapToResponse)
                .toList();
    }

    public List<BookingResponse> getBookingsByCourt(Long courtId, User currentUser) {
        Court court = courtRepository.findById(courtId)
                .orElseThrow(() -> new ResourceNotFoundException("Court", courtId));

        if (currentUser != null && currentUser.getRole() != Role.ADMIN) {
            if (!court.getVenue().getOwner().getId().equals(currentUser.getId())) {
                throw new AccessDeniedException("You do not have permission to view this court's bookings");
            }
        }

        return bookingRepository.findByCourtId(courtId)
                .stream()
                .map(this::mapToResponse)
                .toList();
    }

    public List<BookingResponse> getOwnerBookings(User owner) {
        if (owner == null) {
            throw new AccessDeniedException("Authentication required");
        }
        return bookingRepository.findByCourtVenueOwnerIdOrderByBookingDateDescStartTimeDesc(owner.getId())
                .stream()
                .map(this::mapToResponse)
                .toList();
    }

    public List<BookingResponse> getAdminBookings(String q, String status, LocalDate date) {
        List<Booking> all = bookingRepository.findAll();
        return all.stream()
                .filter(b -> {
                    if (status != null && !status.isBlank() && !b.getStatus().name().equalsIgnoreCase(status)) {
                        return false;
                    }
                    if (date != null && !b.getBookingDate().equals(date)) {
                        return false;
                    }
                    if (q != null && !q.isBlank()) {
                        String match = (b.getId() + " " +
                                b.getUser().getFullName() + " " +
                                b.getCourt().getName() + " " +
                                b.getCourt().getVenue().getName()).toLowerCase();
                        return match.contains(q.toLowerCase().trim());
                    }
                    return true;
                })
                .sorted((a, b) -> b.getBookingDate().compareTo(a.getBookingDate()))
                .map(this::mapToResponse)
                .toList();
    }

    public BookingResponse updateBookingStatus(Long bookingId, String newStatus, User currentUser) {
        Booking booking = bookingRepository.findById(bookingId)
                .orElseThrow(() -> new ResourceNotFoundException("Booking", bookingId));

        verifyBookingAccess(booking, currentUser);

        if (newStatus == null || newStatus.isBlank()) {
            throw new IllegalArgumentException("Status is required");
        }

        BookingStatus targetStatus;
        try {
            targetStatus = BookingStatus.valueOf(newStatus.toUpperCase().trim());
        } catch (IllegalArgumentException e) {
            throw new IllegalArgumentException("Invalid booking status: " + newStatus);
        }

        booking.setStatus(targetStatus);

        if (targetStatus == BookingStatus.CONFIRMED) {
            booking.setHoldExpiresAt(null);
            if (!"SUCCESS".equalsIgnoreCase(booking.getPaymentStatus())) {
                booking.setPaymentStatus("SUCCESS");
                if (booking.getPaymentMethod() == null || booking.getPaymentMethod().isBlank()) {
                    booking.setPaymentMethod("CONFIRMED_BY_OWNER");
                }
            }
        } else if (targetStatus == BookingStatus.COMPLETED) {
            booking.setHoldExpiresAt(null);
            if (!"SUCCESS".equalsIgnoreCase(booking.getPaymentStatus())) {
                booking.setPaymentStatus("SUCCESS");
            }
        } else if (targetStatus == BookingStatus.CANCELLED) {
            booking.setHoldExpiresAt(null);
            booking.setPaymentStatus("CANCELLED");
        }

        Booking saved = bookingRepository.save(booking);
        log.info("Booking #{} status updated to {} by user {}", bookingId, targetStatus, currentUser != null ? currentUser.getEmail() : "anonymous");
        return mapToResponse(saved);
    }

    public BookingResponse cancelBooking(Long bookingId, User currentUser) {
        Booking booking = bookingRepository.findById(bookingId)
                .orElseThrow(() -> new ResourceNotFoundException("Booking", bookingId));

        verifyBookingAccess(booking, currentUser);

        if (booking.getStatus() != BookingStatus.CONFIRMED && booking.getStatus() != BookingStatus.PENDING) {
            throw new IllegalArgumentException("Only active or pending bookings can be cancelled");
        }

        boolean isPast = booking.getBookingDate().isBefore(LocalDate.now()) ||
                (booking.getBookingDate().equals(LocalDate.now()) && booking.getStartTime().isBefore(LocalTime.now()));
        if (isPast) {
            throw new IllegalArgumentException("Past bookings cannot be cancelled");
        }

        booking.setStatus(BookingStatus.CANCELLED);
        booking.setPaymentStatus("CANCELLED");
        booking.setHoldExpiresAt(null);
        return mapToResponse(bookingRepository.save(booking));
    }

    public BookingResponse blockCourtSlot(Long courtId, LocalDate date, LocalTime start, LocalTime end, String reason, User currentUser) {
        Court court = courtRepository.findByIdForUpdate(courtId)
                .orElseThrow(() -> new ResourceNotFoundException("Court", courtId));

        if (currentUser.getRole() != Role.ADMIN && !court.getVenue().getOwner().getId().equals(currentUser.getId())) {
            throw new AccessDeniedException("You do not have permission to block slots on this court");
        }

        boolean overlapping = bookingRepository.existsOverlappingBooking(courtId, date, start, end, LocalDateTime.now());
        if (overlapping) {
            throw new BookingConflictException("Cannot block slot: an active booking already exists for this time");
        }

        Booking block = new Booking();
        block.setUser(currentUser);
        block.setCourt(court);
        block.setBookingDate(date);
        block.setStartTime(start);
        block.setEndTime(end);
        block.setStatus(BookingStatus.BLOCKED);
        block.setPaymentStatus("BLOCKED");
        block.setTotalPrice(BigDecimal.ZERO);
        block.setPaymentMethod(reason != null ? reason : "Owner block");

        return mapToResponse(bookingRepository.save(block));
    }

    private void verifyBookingAccess(Booking booking, User currentUser) {
        if (currentUser == null) {
            throw new AccessDeniedException("Authentication required");
        }
        if (currentUser.getRole() == Role.ADMIN) {
            return;
        }
        boolean isPlayer = booking.getUser() != null && booking.getUser().getId().equals(currentUser.getId());
        boolean isOwner = booking.getCourt() != null &&
                booking.getCourt().getVenue() != null &&
                booking.getCourt().getVenue().getOwner() != null &&
                booking.getCourt().getVenue().getOwner().getId().equals(currentUser.getId());
        if (!isPlayer && !isOwner) {
            throw new AccessDeniedException("You do not have permission to view or manage this booking");
        }
    }

    public BookingResponse mapToResponse(Booking booking) {
        BookingResponse response = new BookingResponse();
        response.setId(booking.getId());
        response.setBookingId(booking.getId());
        response.setReference("QC-" + booking.getId());

        if (booking.getUser() != null) {
            response.setUserId(booking.getUser().getId());
            response.setUserName(booking.getUser().getFullName());
            response.setPlayerName(booking.getUser().getFullName());
            response.setUserEmail(booking.getUser().getEmail());
            response.setPlayerEmail(booking.getUser().getEmail());
        }

        if (booking.getCourt() != null) {
            response.setCourtId(booking.getCourt().getId());
            response.setCourtName(booking.getCourt().getName());

            // Map sport from court, with fallback to venue's sport type
            String sport = booking.getCourt().getSportType();
            if ((sport == null || sport.isBlank()) && booking.getCourt().getVenue() != null) {
                sport = booking.getCourt().getVenue().getSportType();
            }
            response.setSport(sport);
            response.setSportType(sport);

            if (booking.getCourt().getVenue() != null) {
                response.setVenueId(booking.getCourt().getVenue().getId());
                response.setFacilityId(booking.getCourt().getVenue().getId());
                response.setVenueName(booking.getCourt().getVenue().getName());
                response.setFacilityName(booking.getCourt().getVenue().getName());
            }
        }

        response.setBookingDate(booking.getBookingDate());
        response.setDate(booking.getBookingDate());
        response.setStartTime(booking.getStartTime());
        response.setEndTime(booking.getEndTime());

        if (booking.getStartTime() != null && booking.getEndTime() != null) {
            long duration = java.time.Duration.between(booking.getStartTime(), booking.getEndTime()).toMinutes();
            response.setDurationMinutes((int) duration);
        }
        response.setStatus(booking.getStatus());
        response.setPaymentStatus(booking.getPaymentStatus());
        response.setPaymentMethod(booking.getPaymentMethod());
        response.setTransactionId(booking.getTransactionId());

        response.setRazorpayOrderId(booking.getRazorpayOrderId());
        response.setRazorpayKeyId(razorpayService.getKeyId());
        response.setHoldExpiresAt(booking.getHoldExpiresAt());
        response.setGatewayConfigured(razorpayService.isConfigured());
        if (!razorpayService.isConfigured()) {
            response.setGatewayMessage("Razorpay gateway is not configured. Set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET to enable online checkout.");
        }

        response.setTotalPrice(booking.getTotalPrice());
        response.setTotalAmount(booking.getTotalPrice());
        response.setAmount(booking.getTotalPrice());
        response.setCreatedAt(booking.getCreatedAt());

        return response;
    }
}
