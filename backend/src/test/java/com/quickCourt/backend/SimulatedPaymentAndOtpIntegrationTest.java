package com.quickCourt.backend;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.SerializationFeature;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import com.quickCourt.backend.dto.*;
import com.quickCourt.backend.entity.*;
import com.quickCourt.backend.repository.*;
import com.quickCourt.backend.service.BookingService;
import com.quickCourt.backend.service.PasswordResetService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.context.WebApplicationContext;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.Map;

import static org.hamcrest.Matchers.*;
import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.security.test.web.servlet.setup.SecurityMockMvcConfigurers.springSecurity;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
class SimulatedPaymentAndOtpIntegrationTest {

    @Autowired
    private WebApplicationContext webApplicationContext;

    private MockMvc mockMvc;

    private final ObjectMapper objectMapper = new ObjectMapper()
            .registerModule(new JavaTimeModule())
            .disable(SerializationFeature.WRITE_DATES_AS_TIMESTAMPS);

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
    private PasswordResetOtpRepository otpRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private BookingService bookingService;

    @Autowired
    private PasswordResetService passwordResetService;

    private User testPlayer;
    private Court testCourt;

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders.webAppContextSetup(webApplicationContext)
                .apply(springSecurity())
                .build();

        paymentRepository.deleteAll();
        bookingRepository.deleteAll();
        otpRepository.deleteAll();

        // Ensure a test venue and court exist
        if (venueRepository.count() == 0) {
            User owner = userRepository.findByEmailIgnoreCase("demo.owner@quickcourt.com").orElseGet(() -> {
                User u = new User();
                u.setFullName("Demo Facility Owner");
                u.setEmail("demo.owner@quickcourt.com");
                u.setPassword(passwordEncoder.encode("Owner@123"));
                u.setRole(Role.FACILITY_OWNER);
                u.setStatus("ACTIVE");
                return userRepository.save(u);
            });

            Venue v = new Venue();
            v.setName("Test Arena Bengaluru");
            v.setCity("Bengaluru");
            v.setAddress("Test Rd");
            v.setOwner(owner);
            v.setSportType("BADMINTON");
            v.setPrice(300.0);
            v.setRating(4.5);
            v.setReviewCount(10);
            v.setOpeningTime(LocalTime.of(6, 0));
            v.setClosingTime(LocalTime.of(22, 0));
            v = venueRepository.save(v);

            Court c = new Court();
            c.setVenue(v);
            c.setName("Test Court 1");
            c.setSportType("BADMINTON");
            c.setPricePerHour(new BigDecimal("300.00"));
            c.setStatus("ACTIVE");
            testCourt = courtRepository.save(c);
        } else {
            testCourt = courtRepository.findAll().get(0);
        }

        testPlayer = userRepository.findByEmailIgnoreCase("test.sim.player@example.com").orElseGet(() -> {
            User u = new User();
            u.setFullName("Simulated Player");
            u.setEmail("test.sim.player@example.com");
            u.setPassword(passwordEncoder.encode("Password@123"));
            u.setRole(Role.USER);
            u.setStatus("ACTIVE");
            return userRepository.save(u);
        });
    }

    @Test
    void simulatedPayment_confirmsBookingAndPersistsPaymentRecord() throws Exception {
        // 1. Create a hold
        BookingRequest req = new BookingRequest();
        req.setCourtId(testCourt.getId());
        req.setBookingDate(LocalDate.now().plusDays(2));
        req.setStartTime(LocalTime.of(10, 0));
        req.setEndTime(LocalTime.of(11, 0));

        BookingResponse hold = bookingService.createBooking(req, testPlayer);
        assertEquals(BookingStatus.PENDING, hold.getStatus());
        assertNotNull(hold.getHoldExpiresAt());

        // 2. Submit simulated payment
        PaymentRequest payReq = new PaymentRequest();
        payReq.setBookingId(hold.getId());
        payReq.setPaymentMethod("UPI");
        payReq.setPaymentMode("DEMO");

        BookingResponse confirmed = bookingService.confirmSimulatedPayment(hold.getId(), "UPI", testPlayer);

        assertEquals(BookingStatus.CONFIRMED, confirmed.getStatus());
        assertEquals("SUCCESS", confirmed.getPaymentStatus());
        assertTrue(confirmed.getTransactionId().startsWith("SIM_TXN_"));
        assertNull(confirmed.getHoldExpiresAt());

        // 3. Verify Payment entity is saved in database
        Payment payment = paymentRepository.findTopByBookingIdOrderByIdDesc(hold.getId()).orElseThrow();
        assertEquals("SUCCESS", payment.getStatus());
        assertEquals(hold.getTotalPrice(), payment.getAmount());
        assertEquals(confirmed.getTransactionId(), payment.getRazorpayPaymentId());

        // 4. Verify idempotency
        BookingResponse idempotent = bookingService.confirmSimulatedPayment(hold.getId(), "UPI", testPlayer);
        assertEquals(confirmed.getTransactionId(), idempotent.getTransactionId());
    }

    @Test
    void simulatedPayment_rejectsExpiredHold() {
        // Create booking with expired hold
        Booking b = new Booking();
        b.setUser(testPlayer);
        b.setCourt(testCourt);
        b.setBookingDate(LocalDate.now().plusDays(3));
        b.setStartTime(LocalTime.of(14, 0));
        b.setEndTime(LocalTime.of(15, 0));
        b.setTotalPrice(new BigDecimal("300.00"));
        b.setStatus(BookingStatus.PENDING);
        b.setPaymentStatus("PENDING");
        b.setHoldExpiresAt(LocalDateTime.now().minusMinutes(1)); // Expired

        Booking saved = bookingRepository.save(b);

        IllegalStateException ex = assertThrows(IllegalStateException.class, () ->
                bookingService.confirmSimulatedPayment(saved.getId(), "CARD", testPlayer));
        assertTrue(ex.getMessage().contains("hold has expired"));

        // Release expired holds and verify status is CANCELLED
        bookingService.releaseExpiredHolds();
        Booking refreshed = bookingRepository.findById(saved.getId()).orElseThrow();
        assertEquals(BookingStatus.CANCELLED, refreshed.getStatus());
    }

    @Test
    void forgotPassword_completeWorkflow_succeeds() throws Exception {
        String email = testPlayer.getEmail();

        // 1. Request OTP
        ForgotPasswordRequest req = new ForgotPasswordRequest(email);
        Map<String, Object> resp = passwordResetService.requestOtp(req);
        assertNotNull(resp.get("message"));

        // Verify OTP is hashed in DB
        PasswordResetOtp otpEntity = otpRepository.findTopByEmailIgnoreCaseAndUsedFalseOrderByCreatedAtDesc(email).orElseThrow();
        assertTrue(passwordEncoder.matches((String) resp.get("devOtp"), otpEntity.getOtpHashed()));

        String devOtp = (String) resp.get("devOtp");
        assertNotNull(devOtp);
        assertEquals(6, devOtp.length());

        // 2. Reject incorrect OTP
        VerifyOtpRequest badVerify = new VerifyOtpRequest(email, "000000");
        assertThrows(IllegalArgumentException.class, () -> passwordResetService.verifyOtp(badVerify));

        // 3. Verify with valid OTP
        VerifyOtpRequest goodVerify = new VerifyOtpRequest(email, devOtp);
        Map<String, Object> verifyResp = passwordResetService.verifyOtp(goodVerify);
        String resetToken = (String) verifyResp.get("resetToken");
        assertNotNull(resetToken);

        // 4. Reset Password
        ResetPasswordRequest resetReq = new ResetPasswordRequest(email, resetToken, "NewPass@2026", "NewPass@2026");
        Map<String, Object> resetResult = passwordResetService.resetPassword(resetReq);
        assertNotNull(resetResult.get("message"));

        // 5. Test login with new password succeeds
        LoginRequest newLogin = new LoginRequest();
        newLogin.setEmail(email);
        newLogin.setPassword("NewPass@2026");

        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(newLogin)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.token").isNotEmpty());

        // 6. Test login with old password fails
        LoginRequest oldLogin = new LoginRequest();
        oldLogin.setEmail(email);
        oldLogin.setPassword("Password@123");

        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(oldLogin)))
                .andExpect(status().isUnauthorized());

        // 7. Verify OTP / resetToken cannot be reused
        assertThrows(IllegalArgumentException.class, () -> passwordResetService.resetPassword(resetReq));
    }
}
