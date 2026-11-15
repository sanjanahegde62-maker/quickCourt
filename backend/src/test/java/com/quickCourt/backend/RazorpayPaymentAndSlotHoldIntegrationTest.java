package com.quickCourt.backend;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import com.quickCourt.backend.dto.BookingRequest;
import com.quickCourt.backend.dto.RazorpayVerificationRequest;
import com.quickCourt.backend.dto.RegisterRequest;
import com.quickCourt.backend.entity.*;
import com.quickCourt.backend.repository.*;
import com.quickCourt.backend.service.BookingService;
import com.quickCourt.backend.service.RazorpayService;
import org.json.JSONObject;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.context.WebApplicationContext;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.HexFormat;
import java.util.Map;

import static org.hamcrest.Matchers.*;
import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.security.test.web.servlet.setup.SecurityMockMvcConfigurers.springSecurity;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest(classes = com.quickCourt.backend.BackendApplication.class)
class RazorpayPaymentAndSlotHoldIntegrationTest {

    @Autowired
    private WebApplicationContext webApplicationContext;

    private MockMvc mockMvc;

    private final ObjectMapper objectMapper = new ObjectMapper().registerModule(new JavaTimeModule());

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private VenueRepository venueRepository;

    @Autowired
    private CourtRepository courtRepository;

    @Autowired
    private BookingRepository bookingRepository;

    @Autowired
    private PaymentRepository paymentRepository;

    @Autowired
    private BookingService bookingService;

    @Autowired
    private RazorpayService razorpayService;

    @Autowired
    private PasswordEncoder passwordEncoder;

    private Long courtId;
    private String playerToken;
    private final String testSecret = "mockSecretKey456";
    private final String testWebhookSecret = "mockWebhookSecret789";

    @BeforeEach
    void setUp() throws Exception {
        mockMvc = MockMvcBuilders.webAppContextSetup(webApplicationContext)
                .apply(springSecurity())
                .build();

        paymentRepository.deleteAll();
        bookingRepository.deleteAll();
        courtRepository.deleteAll();
        venueRepository.deleteAll();
        userRepository.deleteAll();

        // Seed owner and approved venue with court
        User owner = new User();
        owner.setFullName("Test Owner");
        owner.setEmail("testowner@quickcourt.com");
        owner.setPassword(passwordEncoder.encode("password123"));
        owner.setRole(Role.FACILITY_OWNER);
        owner.setVerified(true);
        owner.setStatus("ACTIVE");
        userRepository.save(owner);

        Venue venue = new Venue();
        venue.setName("Koramangala Badminton Hub");
        venue.setLocation("Koramangala, Bengaluru");
        venue.setCity("Bengaluru");
        venue.setSportType("BADMINTON");
        venue.setPrice(400.0);
        venue.setApproved(true);
        venue.setStatus("APPROVED");
        venue.setOwner(owner);
        venue.setOpeningTime(LocalTime.of(6, 0));
        venue.setClosingTime(LocalTime.of(22, 0));
        venueRepository.save(venue);

        Court court = new Court();
        court.setName("Court 1");
        court.setSportType("BADMINTON");
        court.setPricePerHour(BigDecimal.valueOf(400.00));
        court.setStatus("ACTIVE");
        court.setVenue(venue);
        court = courtRepository.save(court);
        this.courtId = court.getId();

        // Register player and obtain token
        RegisterRequest req = new RegisterRequest();
        req.setName("Player One");
        req.setEmail("playerone@gmail.com");
        req.setPassword("password123");
        req.setRole("USER");

        MvcResult result = mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isCreated())
                .andReturn();

        this.playerToken = objectMapper.readTree(result.getResponse().getContentAsString()).get("token").asText();
    }

    private String calculateSignature(String data, String secret) throws Exception {
        Mac mac = Mac.getInstance("HmacSHA256");
        SecretKeySpec key = new SecretKeySpec(secret.getBytes(StandardCharsets.UTF_8), "HmacSHA256");
        mac.init(key);
        byte[] hash = mac.doFinal(data.getBytes(StandardCharsets.UTF_8));
        return HexFormat.of().formatHex(hash);
    }

    @Test
    void createBooking_placesTemporaryHold_andBlocksConcurrentOverlap() throws Exception {
        LocalDate date = LocalDate.now().plusDays(2);

        BookingRequest req = new BookingRequest();
        req.setCourtId(courtId);
        req.setBookingDate(date);
        req.setStartTime(LocalTime.of(9, 0));
        req.setEndTime(LocalTime.of(10, 0));

        // 1. Create booking: should be in PENDING status with hold expiry
        MvcResult res = mockMvc.perform(post("/api/bookings")
                        .header("Authorization", "Bearer " + playerToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.status").value("PENDING"))
                .andExpect(jsonPath("$.paymentStatus").value("PENDING"))
                .andExpect(jsonPath("$.holdExpiresAt").isNotEmpty())
                .andExpect(jsonPath("$.sport").value("BADMINTON"))
                .andExpect(jsonPath("$.sportType").value("BADMINTON"))
                .andExpect(jsonPath("$.durationMinutes").value(60))
                .andExpect(jsonPath("$.courtName").value("Court 1"))
                .andExpect(jsonPath("$.venueName").value("Koramangala Badminton Hub"))
                .andExpect(jsonPath("$.totalPrice").value(400.0))
                .andReturn();

        Long bookingId = objectMapper.readTree(res.getResponse().getContentAsString()).get("id").asLong();

        // 2. Check availability: 9:00 slot must now show HELD (not AVAILABLE)
        mockMvc.perform(get("/api/courts/" + courtId + "/availability?date=" + date))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[?(@.startTime == '09:00:00')].status").value("HELD"))
                .andExpect(jsonPath("$[?(@.startTime == '09:00:00')].available").value(false));

        // 3. Concurrent overlapping booking attempt must return 409 Conflict
        BookingRequest overlap = new BookingRequest();
        overlap.setCourtId(courtId);
        overlap.setBookingDate(date);
        overlap.setStartTime(LocalTime.of(9, 30));
        overlap.setEndTime(LocalTime.of(10, 30));

        mockMvc.perform(post("/api/bookings")
                        .header("Authorization", "Bearer " + playerToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(overlap)))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.message").value(containsString("already booked or held")));
    }

    @Test
    void paymentVerification_rejectsInvalidSignature() throws Exception {
        LocalDate date = LocalDate.now().plusDays(2);

        BookingRequest req = new BookingRequest();
        req.setCourtId(courtId);
        req.setBookingDate(date);
        req.setStartTime(LocalTime.of(14, 0));
        req.setEndTime(LocalTime.of(15, 0));

        MvcResult res = mockMvc.perform(post("/api/bookings")
                        .header("Authorization", "Bearer " + playerToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isCreated())
                .andReturn();

        Long bookingId = objectMapper.readTree(res.getResponse().getContentAsString()).get("id").asLong();

        // Submit invalid signature
        RazorpayVerificationRequest badReq = new RazorpayVerificationRequest(
                bookingId,
                "order_fake_123",
                "pay_fake_456",
                "invalid_tampered_signature_abc"
        );

        mockMvc.perform(post("/api/payments/razorpay/verify")
                        .header("Authorization", "Bearer " + playerToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(badReq)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value(containsString("Invalid Razorpay payment signature")));

        // Verify booking status remains PENDING, NOT confirmed!
        Booking b = bookingRepository.findById(bookingId).orElseThrow();
        assertEquals(BookingStatus.PENDING, b.getStatus());
        assertEquals("PENDING", b.getPaymentStatus());
    }

    @Test
    void paymentVerification_acceptsValidSignature_confirmsBooking_idempotently() throws Exception {
        LocalDate date = LocalDate.now().plusDays(2);

        BookingRequest req = new BookingRequest();
        req.setCourtId(courtId);
        req.setBookingDate(date);
        req.setStartTime(LocalTime.of(16, 0));
        req.setEndTime(LocalTime.of(17, 0));

        MvcResult res = mockMvc.perform(post("/api/bookings")
                        .header("Authorization", "Bearer " + playerToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isCreated())
                .andReturn();

        Long bookingId = objectMapper.readTree(res.getResponse().getContentAsString()).get("id").asLong();

        String orderId = "order_rzp_test_101";
        String paymentId = "pay_rzp_test_202";
        String validSignature = calculateSignature(orderId + "|" + paymentId, testSecret);

        RazorpayVerificationRequest validReq = new RazorpayVerificationRequest(
                bookingId,
                orderId,
                paymentId,
                validSignature
        );

        // 1. First verification: CONFIRMED
        mockMvc.perform(post("/api/payments/razorpay/verify")
                        .header("Authorization", "Bearer " + playerToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(validReq)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("SUCCESS"))
                .andExpect(jsonPath("$.transactionId").value(paymentId));

        Booking confirmed = bookingRepository.findById(bookingId).orElseThrow();
        assertEquals(BookingStatus.CONFIRMED, confirmed.getStatus());
        assertEquals("SUCCESS", confirmed.getPaymentStatus());
        assertEquals(paymentId, confirmed.getTransactionId());

        // 2. Idempotent second verification: Returns success without error
        mockMvc.perform(post("/api/payments/razorpay/verify")
                        .header("Authorization", "Bearer " + playerToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(validReq)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("SUCCESS"));
    }

    @Test
    void webhook_processesPaymentCaptured_idempotently() throws Exception {
        LocalDate date = LocalDate.now().plusDays(3);

        BookingRequest req = new BookingRequest();
        req.setCourtId(courtId);
        req.setBookingDate(date);
        req.setStartTime(LocalTime.of(10, 0));
        req.setEndTime(LocalTime.of(11, 0));

        MvcResult res = mockMvc.perform(post("/api/bookings")
                        .header("Authorization", "Bearer " + playerToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isCreated())
                .andReturn();

        Long bookingId = objectMapper.readTree(res.getResponse().getContentAsString()).get("id").asLong();

        String orderId = "order_wh_test_303";
        String paymentId = "pay_wh_test_404";

        Booking b = bookingRepository.findById(bookingId).orElseThrow();
        b.setRazorpayOrderId(orderId);
        bookingRepository.save(b);

        // Construct raw webhook payload
        String rawWebhook = """
        {
          "entity": "event",
          "event": "payment.captured",
          "payload": {
            "payment": {
              "entity": {
                "id": "%s",
                "order_id": "%s",
                "amount": 40000,
                "status": "captured",
                "currency": "INR"
              }
            }
          }
        }
        """.formatted(paymentId, orderId);

        String signature = calculateSignature(rawWebhook, testWebhookSecret);

        // Deliver webhook
        mockMvc.perform(post("/api/payments/razorpay/webhook")
                        .header("X-Razorpay-Signature", signature)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(rawWebhook))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("ok"));

        Booking updated = bookingRepository.findById(bookingId).orElseThrow();
        assertEquals(BookingStatus.CONFIRMED, updated.getStatus());
        assertEquals("SUCCESS", updated.getPaymentStatus());
        assertEquals(paymentId, updated.getTransactionId());

        // Duplicate delivery should be safe and idempotent
        mockMvc.perform(post("/api/payments/razorpay/webhook")
                        .header("X-Razorpay-Signature", signature)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(rawWebhook))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("ok"));
    }

    @Test
    void expiredHold_isReleased_andRevertsToAvailable() throws Exception {
        LocalDate date = LocalDate.now().plusDays(2);

        Booking booking = new Booking();
        booking.setUser(userRepository.findByEmail("playerone@gmail.com").orElseThrow());
        booking.setCourt(courtRepository.findById(courtId).orElseThrow());
        booking.setBookingDate(date);
        booking.setStartTime(LocalTime.of(18, 0));
        booking.setEndTime(LocalTime.of(19, 0));
        booking.setStatus(BookingStatus.PENDING);
        booking.setPaymentStatus("PENDING");
        booking.setTotalPrice(BigDecimal.valueOf(400.00));
        // Expired 5 minutes ago!
        booking.setHoldExpiresAt(LocalDateTime.now().minusMinutes(5));
        bookingRepository.save(booking);

        // Slot availability must recognize hold is expired and show AVAILABLE
        mockMvc.perform(get("/api/courts/" + courtId + "/availability?date=" + date))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[?(@.startTime == '18:00:00')].status").value("AVAILABLE"))
                .andExpect(jsonPath("$[?(@.startTime == '18:00:00')].available").value(true));

        // Calling releaseExpiredHolds sets status to CANCELLED / EXPIRED
        bookingService.releaseExpiredHolds();

        Booking refreshed = bookingRepository.findById(booking.getId()).orElseThrow();
        assertEquals(BookingStatus.CANCELLED, refreshed.getStatus());
        assertEquals("EXPIRED", refreshed.getPaymentStatus());
    }

    @Test
    void cancelPendingHold_freesSlotImmediately() throws Exception {
        LocalDate date = LocalDate.now().plusDays(2);

        BookingRequest req = new BookingRequest();
        req.setCourtId(courtId);
        req.setBookingDate(date);
        req.setStartTime(LocalTime.of(20, 0));
        req.setEndTime(LocalTime.of(21, 0));

        MvcResult res = mockMvc.perform(post("/api/bookings")
                        .header("Authorization", "Bearer " + playerToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isCreated())
                .andReturn();

        Long bookingId = objectMapper.readTree(res.getResponse().getContentAsString()).get("id").asLong();

        // Cancel the pending hold
        mockMvc.perform(post("/api/bookings/" + bookingId + "/cancel")
                        .header("Authorization", "Bearer " + playerToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("CANCELLED"));

        // Slot must now be AVAILABLE immediately
        mockMvc.perform(get("/api/courts/" + courtId + "/availability?date=" + date))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[?(@.startTime == '20:00:00')].status").value("AVAILABLE"))
                .andExpect(jsonPath("$[?(@.startTime == '20:00:00')].available").value(true));
    }

    @Test
    void paymentConfig_exposesKeyId_neverExposesSecrets() throws Exception {
        mockMvc.perform(get("/api/payments/config"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.currency").value("INR"))
                .andExpect(jsonPath("$.keyId").value("rzp_test_mockKeyId123"))
                .andExpect(jsonPath("$.secret").doesNotExist())
                .andExpect(jsonPath("$.keySecret").doesNotExist())
                .andExpect(jsonPath("$.webhookSecret").doesNotExist());
    }

    @Test
    void expiredHold_cannotBeVerifiedForPayment() throws Exception {
        LocalDate date = LocalDate.now().plusDays(2);

        Booking booking = new Booking();
        booking.setUser(userRepository.findByEmail("playerone@gmail.com").orElseThrow());
        booking.setCourt(courtRepository.findById(courtId).orElseThrow());
        booking.setBookingDate(date);
        booking.setStartTime(LocalTime.of(12, 0));
        booking.setEndTime(LocalTime.of(13, 0));
        booking.setStatus(BookingStatus.CANCELLED);
        booking.setPaymentStatus("EXPIRED");
        booking.setTotalPrice(BigDecimal.valueOf(400.00));
        booking.setHoldExpiresAt(LocalDateTime.now().minusMinutes(10));
        booking = bookingRepository.save(booking);

        RazorpayVerificationRequest req = new RazorpayVerificationRequest(
                booking.getId(),
                "order_exp_123",
                "pay_exp_456",
                "sig_exp_789"
        );

        mockMvc.perform(post("/api/payments/razorpay/verify")
                        .header("Authorization", "Bearer " + playerToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value(containsString("Booking hold has expired or was cancelled")));
    }
}
