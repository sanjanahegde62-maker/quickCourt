package com.quickCourt.backend;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.SerializationFeature;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import com.quickCourt.backend.dto.BookingRequest;
import com.quickCourt.backend.dto.PaymentRequest;
import com.quickCourt.backend.dto.RazorpayVerificationRequest;
import com.quickCourt.backend.dto.RegisterRequest;
import com.quickCourt.backend.entity.Court;
import com.quickCourt.backend.entity.Role;
import com.quickCourt.backend.entity.User;
import com.quickCourt.backend.entity.Venue;
import com.quickCourt.backend.repository.BookingRepository;
import com.quickCourt.backend.repository.CourtRepository;
import com.quickCourt.backend.repository.PaymentRepository;
import com.quickCourt.backend.repository.UserRepository;
import com.quickCourt.backend.repository.VenueRepository;
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
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.HexFormat;

import static org.hamcrest.Matchers.*;
import static org.springframework.security.test.web.servlet.setup.SecurityMockMvcConfigurers.springSecurity;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
class BookingLifecycleAndConcurrencyIntegrationTest {

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
    private PasswordEncoder passwordEncoder;

    private Long courtId;
    private String player1Token;
    private String player2Token;

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

        // Seed owner and approved venue with a court
        User owner = new User();
        owner.setFullName("Venue Owner");
        owner.setEmail("owner@quickcourt.com");
        owner.setPassword(passwordEncoder.encode("password123"));
        owner.setRole(Role.FACILITY_OWNER);
        owner.setVerified(true);
        owner.setStatus("ACTIVE");
        userRepository.save(owner);

        Venue venue = new Venue();
        venue.setName("Downtown Sports Complex");
        venue.setLocation("Indiranagar");
        venue.setSportType("BADMINTON");
        venue.setPrice(350.0);
        venue.setApproved(true);
        venue.setStatus("APPROVED");
        venue.setOwner(owner);
        venue.setOpeningTime(LocalTime.of(6, 0));
        venue.setClosingTime(LocalTime.of(22, 0));
        venueRepository.save(venue);

        Court court = new Court();
        court.setName("Court Alpha");
        court.setSportType("BADMINTON");
        court.setPricePerHour(BigDecimal.valueOf(350.00));
        court.setStatus("ACTIVE");
        court.setVenue(venue);
        court = courtRepository.save(court);
        this.courtId = court.getId();

        // Seed two players and obtain tokens
        player1Token = obtainToken("player1@gmail.com", "USER");
        player2Token = obtainToken("player2@gmail.com", "USER");
    }

    private String obtainToken(String email, String role) throws Exception {
        RegisterRequest req = new RegisterRequest();
        req.setName("User " + email);
        req.setEmail(email);
        req.setPassword("password123");
        req.setRole(role);

        MvcResult result = mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isCreated())
                .andReturn();

        return objectMapper.readTree(result.getResponse().getContentAsString()).get("token").asText();
    }

    private String calculateSignature(String data, String secret) throws Exception {
        Mac mac = Mac.getInstance("HmacSHA256");
        SecretKeySpec key = new SecretKeySpec(secret.getBytes(StandardCharsets.UTF_8), "HmacSHA256");
        mac.init(key);
        byte[] hash = mac.doFinal(data.getBytes(StandardCharsets.UTF_8));
        return HexFormat.of().formatHex(hash);
    }

    @Test
    void fullBookingLifecycle_conflictDetection_paymentAndCancellation() throws Exception {
        LocalDate tomorrow = LocalDate.now().plusDays(1);

        // 1. Player 1 books 10:00 to 11:00
        BookingRequest b1 = new BookingRequest();
        b1.setCourtId(courtId);
        b1.setBookingDate(tomorrow);
        b1.setStartTime(LocalTime.of(10, 0));
        b1.setEndTime(LocalTime.of(11, 0));

        MvcResult b1Result = mockMvc.perform(post("/api/bookings")
                        .header("Authorization", "Bearer " + player1Token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(b1)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.status").value("PENDING"))
                .andExpect(jsonPath("$.totalPrice").value(350.0))
                .andReturn();

        Long bookingId = objectMapper.readTree(b1Result.getResponse().getContentAsString()).get("id").asLong();

        // 2. Player 2 attempts overlapping booking 10:30 to 11:30 -> MUST return HTTP 409 Conflict!
        BookingRequest bOverlapping = new BookingRequest();
        bOverlapping.setCourtId(courtId);
        bOverlapping.setBookingDate(tomorrow);
        bOverlapping.setStartTime(LocalTime.of(10, 30));
        bOverlapping.setEndTime(LocalTime.of(11, 30));

        mockMvc.perform(post("/api/bookings")
                        .header("Authorization", "Bearer " + player2Token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(bOverlapping)))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.message").value(containsString("already booked")));

        // 3. Adjacent booking 11:00 to 12:00 -> Allowed!
        BookingRequest bAdjacent = new BookingRequest();
        bAdjacent.setCourtId(courtId);
        bAdjacent.setBookingDate(tomorrow);
        bAdjacent.setStartTime(LocalTime.of(11, 0));
        bAdjacent.setEndTime(LocalTime.of(12, 0));

        mockMvc.perform(post("/api/bookings")
                        .header("Authorization", "Bearer " + player2Token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(bAdjacent)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.status").value("PENDING"));

        // 4. Player 1 retrieves their bookings via /api/bookings/me
        mockMvc.perform(get("/api/bookings/me")
                        .header("Authorization", "Bearer " + player1Token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(1)))
                .andExpect(jsonPath("$[0].id").value(bookingId));

        // 5. Player 2 attempts to view Player 1's booking details -> 403 Forbidden
        mockMvc.perform(get("/api/bookings/" + bookingId)
                        .header("Authorization", "Bearer " + player2Token))
                .andExpect(status().isForbidden());

        // 6. Player 1 views their own booking details -> 200 OK
        mockMvc.perform(get("/api/bookings/" + bookingId)
                        .header("Authorization", "Bearer " + player1Token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(bookingId))
                .andExpect(jsonPath("$.totalAmount").value(350.0));

        // 7. Player 1 completes Razorpay payment verification
        String orderId = "order_b1_test";
        String paymentId = "pay_b1_test";
        String validSig = calculateSignature(orderId + "|" + paymentId, "mockSecretKey456");

        RazorpayVerificationRequest payReq = new RazorpayVerificationRequest(
                bookingId,
                orderId,
                paymentId,
                validSig
        );

        mockMvc.perform(post("/api/payments/razorpay/verify")
                        .header("Authorization", "Bearer " + player1Token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(payReq)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("SUCCESS"))
                .andExpect(jsonPath("$.bookingId").value(bookingId));

        // 8. Player 2 attempts to cancel Player 1's booking -> 403 Forbidden
        mockMvc.perform(post("/api/bookings/" + bookingId + "/cancel")
                        .header("Authorization", "Bearer " + player2Token))
                .andExpect(status().isForbidden());

        // 9. Player 1 cancels their booking
        mockMvc.perform(post("/api/bookings/" + bookingId + "/cancel")
                        .header("Authorization", "Bearer " + player1Token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("CANCELLED"));

        // 10. Check availability: the 10:00-11:00 slot is AVAILABLE again!
        mockMvc.perform(get("/api/courts/" + courtId + "/availability?date=" + tomorrow))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[?(@.startTime == '10:00:00')].status").value("AVAILABLE"))
                .andExpect(jsonPath("$[?(@.startTime == '10:00:00')].available").value(true));
    }
}
