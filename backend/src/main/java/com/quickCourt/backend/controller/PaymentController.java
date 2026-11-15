package com.quickCourt.backend.controller;

import com.quickCourt.backend.dto.BookingResponse;
import com.quickCourt.backend.dto.PaymentRequest;
import com.quickCourt.backend.dto.PaymentResponse;
import com.quickCourt.backend.dto.RazorpayOrderResponse;
import com.quickCourt.backend.dto.RazorpayVerificationRequest;
import com.quickCourt.backend.entity.Booking;
import com.quickCourt.backend.entity.Payment;
import com.quickCourt.backend.entity.User;
import com.quickCourt.backend.repository.PaymentRepository;
import com.quickCourt.backend.service.BookingService;
import com.quickCourt.backend.service.RazorpayService;
import jakarta.validation.Valid;
import org.json.JSONObject;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping({"/api/payments", "/payments"})
public class PaymentController {

    private static final Logger log = LoggerFactory.getLogger(PaymentController.class);

    private final BookingService bookingService;
    private final RazorpayService razorpayService;
    private final PaymentRepository paymentRepository;

    public PaymentController(BookingService bookingService,
                             RazorpayService razorpayService,
                             PaymentRepository paymentRepository) {
        this.bookingService = bookingService;
        this.razorpayService = razorpayService;
        this.paymentRepository = paymentRepository;
    }

    /**
     * Exposes public gateway status and public Razorpay Key ID (never secrets).
     * Indicates active payment mode (DEMO by default for demonstration).
     */
    @GetMapping("/config")
    public ResponseEntity<Map<String, Object>> getPaymentConfig() {
        boolean rzpConfigured = razorpayService.isConfigured();
        return ResponseEntity.ok(Map.of(
                "mode", "DEMO",
                "demoMode", true,
                "configured", true,
                "keyId", rzpConfigured ? razorpayService.getKeyId() : "",
                "currency", "INR",
                "webhookConfigured", razorpayService.isWebhookConfigured(),
                "razorpayConfigured", rzpConfigured
        ));
    }

    /**
     * Creates or retrieves a server-generated Razorpay Order for a pending booking.
     */
    @PostMapping({"/order", "/razorpay/order"})
    public ResponseEntity<RazorpayOrderResponse> createPaymentOrder(
            @RequestBody Map<String, Object> body,
            @AuthenticationPrincipal User currentUser) {

        Object bookingIdObj = body.get("bookingId");
        if (bookingIdObj == null) {
            throw new IllegalArgumentException("bookingId is required to create a payment order");
        }
        Long bookingId = Long.valueOf(bookingIdObj.toString());

        RazorpayOrderResponse order = bookingService.createOrGetRazorpayOrder(bookingId, currentUser);
        return ResponseEntity.ok(order);
    }

    /**
     * Authoritatively verifies Razorpay signature and confirms booking upon payment capture.
     */
    @PostMapping({"/verify", "/razorpay/verify"})
    public ResponseEntity<PaymentResponse> verifyPayment(
            @Valid @RequestBody RazorpayVerificationRequest request,
            @AuthenticationPrincipal User currentUser) {

        BookingResponse confirmed = bookingService.verifyAndConfirmRazorpayPayment(
                request.getBookingId(),
                request.getRazorpayOrderId(),
                request.getRazorpayPaymentId(),
                request.getRazorpaySignature(),
                currentUser
        );

        PaymentResponse response = new PaymentResponse(
                confirmed.getId(),
                confirmed.getId(),
                confirmed.getId(),
                confirmed.getTotalPrice(),
                confirmed.getTotalPrice(),
                "SUCCESS",
                "SUCCESS",
                "RAZORPAY",
                "RAZORPAY",
                confirmed.getTransactionId(),
                confirmed.getTransactionId(),
                "Razorpay payment verified and booking confirmed successfully"
        );

        return ResponseEntity.ok(response);
    }

    /**
     * Server-to-server Razorpay Webhook listener with HMAC-SHA256 signature verification.
     */
    @PostMapping({"/webhook", "/razorpay/webhook"})
    public ResponseEntity<Map<String, String>> handleWebhook(
            @RequestBody String rawPayload,
            @RequestHeader(value = "X-Razorpay-Signature", required = false) String signature) {

        log.info("Received Razorpay webhook event with signature present: {}", signature != null);

        // Verify webhook signature if configured
        if (razorpayService.isWebhookConfigured()) {
            boolean valid = razorpayService.verifyWebhookSignature(rawPayload, signature);
            if (!valid) {
                log.error("Razorpay webhook signature verification failed!");
                return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                        .body(Map.of("error", "Invalid webhook signature"));
            }
        }

        try {
            JSONObject eventObj = new JSONObject(rawPayload);
            String event = eventObj.optString("event");
            log.info("Processing verified Razorpay webhook event: {}", event);

            JSONObject payload = eventObj.optJSONObject("payload");
            if (payload != null) {
                JSONObject paymentEntity = payload.optJSONObject("payment") != null
                        ? payload.getJSONObject("payment").optJSONObject("entity")
                        : null;

                if (paymentEntity != null) {
                    String paymentId = paymentEntity.optString("id");
                    String orderId = paymentEntity.optString("order_id");
                    long amountPaise = paymentEntity.optLong("amount", 0);
                    BigDecimal amount = BigDecimal.valueOf(amountPaise).divide(BigDecimal.valueOf(100));

                    if ("payment.captured".equals(event) || "order.paid".equals(event)) {
                        bookingService.handlePaymentCaptured(orderId, paymentId, amount);
                    } else if ("payment.failed".equals(event)) {
                        String errorDesc = paymentEntity.optString("error_description", "Payment failed");
                        bookingService.handlePaymentFailed(orderId, paymentId, errorDesc);
                    }
                }
            }
            return ResponseEntity.ok(Map.of("status", "ok"));
        } catch (Exception e) {
            log.error("Error processing webhook payload: {}", e.getMessage(), e);
            return ResponseEntity.ok(Map.of("status", "error", "message", e.getMessage()));
        }
    }

    /**
     * Dedicated DEMO / Simulated payment confirmation endpoint.
     * Generates a unique transaction ID, validates hold, persists the payment record,
     * and authoritatively confirms the booking.
     */
    @PostMapping({"/simulate", "/demo"})
    public ResponseEntity<PaymentResponse> simulatePayment(
            @Valid @RequestBody PaymentRequest request,
            @AuthenticationPrincipal User currentUser) {

        BookingResponse confirmed = bookingService.confirmSimulatedPayment(
                request.getBookingId(),
                request.getPaymentMethod(),
                currentUser
        );

        PaymentResponse response = new PaymentResponse(
                confirmed.getId(),
                confirmed.getId(),
                confirmed.getId(),
                confirmed.getTotalPrice(),
                confirmed.getTotalPrice(),
                "SUCCESS",
                "SUCCESS",
                confirmed.getPaymentMethod(),
                confirmed.getPaymentMethod(),
                confirmed.getTransactionId(),
                confirmed.getTransactionId(),
                "Simulated payment processed and booking confirmed successfully"
        );

        return ResponseEntity.ok(response);
    }

    /**
     * Primary payment endpoint.
     * If Razorpay credentials & signatures are present, performs cryptographic verification.
     * In DEMO mode or when requested as DEMO/SIMULATED, executes authoritative simulated confirmation.
     */
    @PostMapping
    public ResponseEntity<PaymentResponse> createPayment(
            @Valid @RequestBody PaymentRequest request,
            @AuthenticationPrincipal User currentUser) {

        // If Razorpay signature and payment details are supplied, perform authoritative verification
        if (request.getRazorpayPaymentId() != null && request.getRazorpaySignature() != null) {
            BookingResponse confirmed = bookingService.verifyAndConfirmRazorpayPayment(
                    request.getBookingId(),
                    request.getRazorpayOrderId(),
                    request.getRazorpayPaymentId(),
                    request.getRazorpaySignature(),
                    currentUser
            );

            return ResponseEntity.ok(new PaymentResponse(
                    confirmed.getId(),
                    confirmed.getId(),
                    confirmed.getId(),
                    confirmed.getTotalPrice(),
                    confirmed.getTotalPrice(),
                    "SUCCESS",
                    "SUCCESS",
                    "RAZORPAY",
                    "RAZORPAY",
                    confirmed.getTransactionId(),
                    confirmed.getTransactionId(),
                    "Payment verified and booking confirmed"
            ));
        }

        // Handle DEMO / Simulated mode
        boolean isDemo = "DEMO".equalsIgnoreCase(request.getPaymentMode()) ||
                "SIMULATED".equalsIgnoreCase(request.getPaymentMode()) ||
                (request.getPaymentMethod() != null && request.getPaymentMethod().toUpperCase().startsWith("DEMO")) ||
                !razorpayService.isConfigured();

        if (isDemo) {
            BookingResponse confirmed = bookingService.confirmSimulatedPayment(
                    request.getBookingId(),
                    request.getPaymentMethod() != null ? request.getPaymentMethod() : "DEMO_SIMULATED",
                    currentUser
            );

            return ResponseEntity.ok(new PaymentResponse(
                    confirmed.getId(),
                    confirmed.getId(),
                    confirmed.getId(),
                    confirmed.getTotalPrice(),
                    confirmed.getTotalPrice(),
                    "SUCCESS",
                    "SUCCESS",
                    confirmed.getPaymentMethod(),
                    confirmed.getPaymentMethod(),
                    confirmed.getTransactionId(),
                    confirmed.getTransactionId(),
                    "Simulated payment processed and booking confirmed successfully"
            ));
        }

        throw new IllegalArgumentException("Payment cannot be confirmed without valid transaction signature or demo mode parameter.");
    }

    @GetMapping("/{id}")
    public ResponseEntity<PaymentResponse> getPayment(
            @PathVariable Long id,
            @AuthenticationPrincipal User currentUser) {

        Optional<Payment> optPayment = paymentRepository.findById(id);
        if (optPayment.isPresent()) {
            Payment p = optPayment.get();
            return ResponseEntity.ok(new PaymentResponse(
                    p.getId(),
                    p.getId(),
                    p.getBooking().getId(),
                    p.getAmount(),
                    p.getAmount(),
                    p.getStatus(),
                    p.getStatus(),
                    p.getPaymentMethod(),
                    p.getPaymentMethod(),
                    p.getRazorpayPaymentId() != null ? p.getRazorpayPaymentId() : "TXN-" + p.getId(),
                    p.getRazorpayOrderId(),
                    "Payment details retrieved"
            ));
        }

        // Lookup by booking ID
        BookingResponse booking = bookingService.getBookingById(id, currentUser);
        return ResponseEntity.ok(new PaymentResponse(
                booking.getId(),
                booking.getId(),
                booking.getId(),
                booking.getTotalPrice(),
                booking.getTotalPrice(),
                booking.getPaymentStatus(),
                booking.getPaymentStatus(),
                booking.getPaymentMethod(),
                booking.getPaymentMethod(),
                booking.getTransactionId() != null ? booking.getTransactionId() : "TXN-" + booking.getId(),
                booking.getRazorpayOrderId(),
                "Payment status retrieved for booking #" + id
        ));
    }

    @GetMapping("/methods")
    public ResponseEntity<List<Map<String, String>>> getPaymentMethods() {
        return ResponseEntity.ok(List.of(
                Map.of("code", "UPI", "label", "UPI (Google Pay, PhonePe, Paytm - Demo)", "mode", "DEMO"),
                Map.of("code", "CARD", "label", "Debit / Credit Card (Demo)", "mode", "DEMO"),
                Map.of("code", "NETBANKING", "label", "Net Banking (Demo Simulation)", "mode", "DEMO")
        ));
    }
}
