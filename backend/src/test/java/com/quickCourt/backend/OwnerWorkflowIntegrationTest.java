package com.quickCourt.backend;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.SerializationFeature;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import com.quickCourt.backend.dto.BookingRequest;
import com.quickCourt.backend.dto.RegisterRequest;
import com.quickCourt.backend.dto.VenueRequest;
import com.quickCourt.backend.entity.*;
import com.quickCourt.backend.repository.*;
import com.quickCourt.backend.service.BookingService;
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

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;
import java.util.Map;

import static org.hamcrest.Matchers.*;
import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.security.test.web.servlet.setup.SecurityMockMvcConfigurers.springSecurity;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
class OwnerWorkflowIntegrationTest {

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

    @Autowired
    private BookingService bookingService;

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders.webAppContextSetup(webApplicationContext)
                .apply(springSecurity())
                .build();

        paymentRepository.deleteAll();
        bookingRepository.deleteAll();
        courtRepository.deleteAll();
        venueRepository.deleteAll();
        userRepository.deleteAll();
    }

    private String obtainToken(String email, String role) throws Exception {
        RegisterRequest req = new RegisterRequest();
        req.setName("User " + email);
        req.setEmail(email);
        req.setPassword("Password@123");
        req.setRole(role);

        MvcResult result = mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isCreated())
                .andReturn();

        return objectMapper.readTree(result.getResponse().getContentAsString()).get("token").asText();
    }

    @Test
    void ownerCanManageBookingStatusAndCancel() throws Exception {
        // 1. Create owner and player
        String ownerToken = obtainToken("owner.workflow@quickcourt.com", "OWNER");
        String playerToken = obtainToken("player.workflow@quickcourt.com", "USER");

        User owner = userRepository.findByEmailIgnoreCase("owner.workflow@quickcourt.com").orElseThrow();
        User player = userRepository.findByEmailIgnoreCase("player.workflow@quickcourt.com").orElseThrow();

        // 2. Owner creates venue and court
        Venue venue = new Venue();
        venue.setName("Royal Badminton Arena");
        venue.setLocation("Indiranagar, Bengaluru");
        venue.setCity("Bengaluru");
        venue.setAddress("Indiranagar, Bengaluru");
        venue.setSportType("BADMINTON");
        venue.setPrice(400.0);
        venue.setRating(4.8);
        venue.setApproved(true);
        venue.setStatus("APPROVED");
        venue.setOwner(owner);
        venue = venueRepository.save(venue);

        Court court = new Court();
        court.setName("Court Alpha");
        court.setSportType("BADMINTON");
        court.setPricePerHour(new BigDecimal("400.00"));
        court.setStatus("ACTIVE");
        court.setVenue(venue);
        court = courtRepository.save(court);

        // 3. Player books court
        LocalDate bookingDate = LocalDate.now().plusDays(2);
        BookingRequest bookingReq = new BookingRequest();
        bookingReq.setCourtId(court.getId());
        bookingReq.setBookingDate(bookingDate);
        bookingReq.setStartTime(LocalTime.of(16, 0));
        bookingReq.setEndTime(LocalTime.of(17, 0));

        MvcResult bookingResult = mockMvc.perform(post("/api/bookings")
                        .header("Authorization", "Bearer " + playerToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(bookingReq)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.status", is("PENDING")))
                .andReturn();

        Long bookingId = objectMapper.readTree(bookingResult.getResponse().getContentAsString()).get("id").asLong();

        // 4. Owner views bookings
        mockMvc.perform(get("/api/owner/bookings")
                        .header("Authorization", "Bearer " + ownerToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(1)))
                .andExpect(jsonPath("$[0].id", is(bookingId.intValue())))
                .andExpect(jsonPath("$[0].userName", is("User player.workflow@quickcourt.com")));

        // 5. Owner updates status to CONFIRMED
        mockMvc.perform(patch("/api/owner/bookings/" + bookingId + "/status")
                        .header("Authorization", "Bearer " + ownerToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"status\":\"CONFIRMED\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status", is("CONFIRMED")));

        Booking updatedBooking = bookingRepository.findById(bookingId).orElseThrow();
        assertEquals(BookingStatus.CONFIRMED, updatedBooking.getStatus());

        // 6. Owner cancels the confirmed booking
        mockMvc.perform(post("/api/owner/bookings/" + bookingId + "/cancel")
                        .header("Authorization", "Bearer " + ownerToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status", is("CANCELLED")));

        updatedBooking = bookingRepository.findById(bookingId).orElseThrow();
        assertEquals(BookingStatus.CANCELLED, updatedBooking.getStatus());

        // 7. Slot is released - player books the same slot again!
        MvcResult rebookedResult = mockMvc.perform(post("/api/bookings")
                        .header("Authorization", "Bearer " + playerToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(bookingReq)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.status", is("PENDING")))
                .andReturn();

        Long newBookingId = objectMapper.readTree(rebookedResult.getResponse().getContentAsString()).get("id").asLong();

        // 8. Owner updates new booking to COMPLETED
        mockMvc.perform(put("/api/owner/bookings/" + newBookingId + "/status")
                        .header("Authorization", "Bearer " + ownerToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"status\":\"COMPLETED\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status", is("COMPLETED")));

        Booking completedBooking = bookingRepository.findById(newBookingId).orElseThrow();
        assertEquals(BookingStatus.COMPLETED, completedBooking.getStatus());
        assertEquals("SUCCESS", completedBooking.getPaymentStatus());

        // 9. Owner analytics reflect total bookings (2 including cancelled) and revenue (400 for completed)
        mockMvc.perform(get("/api/owner/analytics")
                        .header("Authorization", "Bearer " + ownerToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalBookings", is(2)))
                .andExpect(jsonPath("$.totalRevenue", is(400.0)))
                .andExpect(jsonPath("$.activeCourts", is(1)))
                .andExpect(jsonPath("$.activeFacilities", is(1)));
    }

    @Test
    void ownerAutoAttachesDemoVenues_whenNewOwnerHasNone() throws Exception {
        // Create demo owner and demo venue
        User demoOwner = new User();
        demoOwner.setFullName("Demo Facility Owner");
        demoOwner.setEmail("demo.owner@quickcourt.com");
        demoOwner.setPassword(passwordEncoder.encode("Owner@123"));
        demoOwner.setRole(Role.FACILITY_OWNER);
        demoOwner.setStatus("ACTIVE");
        demoOwner = userRepository.save(demoOwner);

        Venue demoVenue = new Venue();
        demoVenue.setName("SmashZone Badminton Arena");
        demoVenue.setLocation("Koramangala, Bengaluru");
        demoVenue.setCity("Bengaluru");
        demoVenue.setAddress("Koramangala, Bengaluru");
        demoVenue.setSportType("BADMINTON");
        demoVenue.setPrice(350.0);
        demoVenue.setRating(4.7);
        demoVenue.setApproved(true);
        demoVenue.setStatus("APPROVED");
        demoVenue.setOwner(demoOwner);
        demoVenue = venueRepository.save(demoVenue);

        Court demoCourt = new Court();
        demoCourt.setName("SmashZone Court 1");
        demoCourt.setSportType("BADMINTON");
        demoCourt.setPricePerHour(new BigDecimal("350.00"));
        demoCourt.setStatus("ACTIVE");
        demoCourt.setVenue(demoVenue);
        courtRepository.save(demoCourt);

        // Now a newly registered owner logs in (like user 'johny')
        String newOwnerToken = obtainToken("johny.owner@quickcourt.com", "OWNER");

        // When new owner views facilities or analytics, demo venues auto-attach
        mockMvc.perform(get("/api/owner/facilities")
                        .header("Authorization", "Bearer " + newOwnerToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(greaterThanOrEqualTo(1))))
                .andExpect(jsonPath("$[0].name", is("SmashZone Badminton Arena")));

        mockMvc.perform(get("/api/owner/analytics")
                        .header("Authorization", "Bearer " + newOwnerToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.activeFacilities", is(greaterThanOrEqualTo(1))))
                .andExpect(jsonPath("$.activeCourts", is(greaterThanOrEqualTo(1))));
    }

    @Test
    void unauthorizedUser_cannotUpdateOwnerBookings() throws Exception {
        String owner1Token = obtainToken("owner.one@sports.com", "OWNER");
        String owner2Token = obtainToken("owner.two@sports.com", "OWNER");
        String playerToken = obtainToken("player.other@sports.com", "USER");

        User owner1 = userRepository.findByEmailIgnoreCase("owner.one@sports.com").orElseThrow();
        User player = userRepository.findByEmailIgnoreCase("player.other@sports.com").orElseThrow();

        Venue venue = new Venue();
        venue.setName("Owner One Arena");
        venue.setLocation("MG Road, Bengaluru");
        venue.setCity("Bengaluru");
        venue.setAddress("MG Road");
        venue.setSportType("BADMINTON");
        venue.setPrice(300.0);
        venue.setApproved(true);
        venue.setStatus("APPROVED");
        venue.setOwner(owner1);
        venue = venueRepository.save(venue);

        Court court = new Court();
        court.setName("Court 1");
        court.setSportType("BADMINTON");
        court.setPricePerHour(new BigDecimal("300.00"));
        court.setStatus("ACTIVE");
        court.setVenue(venue);
        court = courtRepository.save(court);

        BookingRequest bookingReq = new BookingRequest();
        bookingReq.setCourtId(court.getId());
        bookingReq.setBookingDate(LocalDate.now().plusDays(5));
        bookingReq.setStartTime(LocalTime.of(18, 0));
        bookingReq.setEndTime(LocalTime.of(19, 0));

        MvcResult bookingResult = mockMvc.perform(post("/api/bookings")
                        .header("Authorization", "Bearer " + playerToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(bookingReq)))
                .andExpect(status().isCreated())
                .andReturn();
        Long bookingId = objectMapper.readTree(bookingResult.getResponse().getContentAsString()).get("id").asLong();

        // Owner 2 tries to update Owner 1's booking -> 403 Forbidden
        mockMvc.perform(patch("/api/owner/bookings/" + bookingId + "/status")
                        .header("Authorization", "Bearer " + owner2Token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"status\":\"CONFIRMED\"}"))
                .andExpect(status().isForbidden());

        // Normal player tries to update booking status via owner endpoint -> 403 Forbidden
        mockMvc.perform(patch("/api/owner/bookings/" + bookingId + "/status")
                        .header("Authorization", "Bearer " + playerToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"status\":\"CONFIRMED\"}"))
                .andExpect(status().isForbidden());
    }
}
