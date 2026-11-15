package com.quickCourt.backend;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.SerializationFeature;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import com.quickCourt.backend.dto.CourtRequest;
import com.quickCourt.backend.dto.RegisterRequest;
import com.quickCourt.backend.dto.VenueRequest;
import com.quickCourt.backend.entity.Role;
import com.quickCourt.backend.entity.User;
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

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

import static org.hamcrest.Matchers.*;
import static org.springframework.security.test.web.servlet.setup.SecurityMockMvcConfigurers.springSecurity;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
class VenueAndCourtIntegrationTest {

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
        req.setPassword("password123");
        req.setRole(role);

        MvcResult result = mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isCreated())
                .andReturn();

        return objectMapper.readTree(result.getResponse().getContentAsString()).get("token").asText();
    }

    private String createAdminAndGetToken() throws Exception {
        User admin = new User();
        admin.setFullName("Master Admin");
        admin.setEmail("admin@quickcourt.com");
        admin.setPassword(passwordEncoder.encode("adminpass123"));
        admin.setRole(Role.ADMIN);
        admin.setVerified(true);
        admin.setStatus("ACTIVE");
        userRepository.save(admin);

        MvcResult result = mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"admin@quickcourt.com\",\"password\":\"adminpass123\"}"))
                .andExpect(status().isOk())
                .andReturn();

        return objectMapper.readTree(result.getResponse().getContentAsString()).get("token").asText();
    }

    @Test
    void venueCreationApprovalAndCourtWorkflow() throws Exception {
        String ownerToken = obtainToken("owner1@sports.com", "OWNER");
        String adminToken = createAdminAndGetToken();
        String playerToken = obtainToken("player1@sports.com", "USER");

        // 1. Owner creates a venue
        VenueRequest venueReq = new VenueRequest();
        venueReq.setName("Green Valley Sports Arena");
        venueReq.setLocation("Bangalore");
        venueReq.setDescription("Premier indoor sports arena");
        venueReq.setSportTypes(List.of("BADMINTON", "TENNIS"));
        venueReq.setPrice(500.0);
        venueReq.setOpeningTime("06:00");
        venueReq.setClosingTime("22:00");

        MvcResult venueResult = mockMvc.perform(post("/api/owner/facilities")
                        .header("Authorization", "Bearer " + ownerToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(venueReq)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.name").value("Green Valley Sports Arena"))
                .andExpect(jsonPath("$.status").value("PENDING"))
                .andExpect(jsonPath("$.approved").value(false))
                .andReturn();

        Long venueId = objectMapper.readTree(venueResult.getResponse().getContentAsString()).get("id").asLong();

        // 2. Public /api/venues should NOT return the pending venue
        mockMvc.perform(get("/api/venues"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(0)));

        // 3. Admin views pending facilities and approves it
        mockMvc.perform(get("/api/admin/facilities?status=PENDING")
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(1)))
                .andExpect(jsonPath("$[0].id").value(venueId));

        mockMvc.perform(post("/api/admin/facilities/" + venueId + "/approve")
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("APPROVED"))
                .andExpect(jsonPath("$.approved").value(true));

        // 4. Now public /api/venues returns the approved venue!
        mockMvc.perform(get("/api/venues"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(1)))
                .andExpect(jsonPath("$[0].name").value("Green Valley Sports Arena"));

        // 5. Owner adds a court to this venue
        CourtRequest courtReq = new CourtRequest();
        courtReq.setName("Court 1 (Wooden)");
        courtReq.setSportType("BADMINTON");
        courtReq.setPricePerHour(BigDecimal.valueOf(400.00));

        MvcResult courtResult = mockMvc.perform(post("/api/owner/facilities/" + venueId + "/courts")
                        .header("Authorization", "Bearer " + ownerToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(courtReq)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.name").value("Court 1 (Wooden)"))
                .andExpect(jsonPath("$.facilityId").value(venueId))
                .andReturn();

        Long courtId = objectMapper.readTree(courtResult.getResponse().getContentAsString()).get("id").asLong();

        // 6. Player cannot add courts -> 403 Forbidden
        mockMvc.perform(post("/api/owner/facilities/" + venueId + "/courts")
                        .header("Authorization", "Bearer " + playerToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(courtReq)))
                .andExpect(status().isForbidden());

        // 7. Check availability for tomorrow
        LocalDate tomorrow = LocalDate.now().plusDays(1);
        mockMvc.perform(get("/api/courts/" + courtId + "/availability?date=" + tomorrow))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(greaterThan(5))))
                .andExpect(jsonPath("$[0].status").value("AVAILABLE"))
                .andExpect(jsonPath("$[0].available").value(true))
                .andExpect(jsonPath("$[0].price").value(400.0));
    }

    @Test
    void locationSearchByCityAndLocality_success() throws Exception {
        String ownerToken = obtainToken("owner_loc@sports.com", "OWNER");
        String adminToken = createAdminAndGetToken();

        // Create Venue A in Electronic City, Bengaluru
        VenueRequest vA = new VenueRequest();
        vA.setName("Electronic City Sports Park");
        vA.setLocation("Electronic City, Bengaluru");
        vA.setAddress("Phase 1, Electronic City, Bengaluru, Karnataka 560100");
        vA.setCity("Bengaluru");
        vA.setPincode("560100");
        vA.setSportTypes(List.of("BADMINTON", "FOOTBALL"));
        vA.setPrice(450.0);
        vA.setRating(4.8);
        vA.setReviewCount(50);
        vA.setAmenities("Parking, Floodlights, Changing Room");

        MvcResult resA = mockMvc.perform(post("/api/owner/facilities")
                        .header("Authorization", "Bearer " + ownerToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(vA)))
                .andExpect(status().isCreated())
                .andReturn();
        Long idA = objectMapper.readTree(resA.getResponse().getContentAsString()).get("id").asLong();

        // Create Venue B in Koramangala, Bengaluru (Pending approval)
        VenueRequest vB = new VenueRequest();
        vB.setName("Koramangala Tennis Center");
        vB.setLocation("Koramangala, Bengaluru");
        vB.setAddress("5th Block, Koramangala, Bengaluru, Karnataka 560034");
        vB.setCity("Bengaluru");
        vB.setPincode("560034");
        vB.setSportTypes(List.of("TENNIS"));
        vB.setPrice(600.0);
        vB.setRating(4.5);
        vB.setReviewCount(20);

        MvcResult resB = mockMvc.perform(post("/api/owner/facilities")
                        .header("Authorization", "Bearer " + ownerToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(vB)))
                .andExpect(status().isCreated())
                .andReturn();
        Long idB = objectMapper.readTree(resB.getResponse().getContentAsString()).get("id").asLong();

        // Approve only Venue A
        mockMvc.perform(post("/api/admin/facilities/" + idA + "/approve")
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk());

        // Test 1: Search by city "bengaluru" (case-insensitive) -> returns Venue A, excludes unapproved Venue B
        mockMvc.perform(get("/api/venues?q=bengaluru"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(1)))
                .andExpect(jsonPath("$[0].name").value("Electronic City Sports Park"));

        // Test 2: Search by area "Electronic City" -> returns Venue A
        mockMvc.perform(get("/api/venues?q=Electronic City"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(1)))
                .andExpect(jsonPath("$[0].name").value("Electronic City Sports Park"));

        // Test 3: Search by pincode "560100" -> returns Venue A
        mockMvc.perform(get("/api/venues?q=560100"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(1)));

        // Test 4: Search for unapproved venue's area "Koramangala" -> returns 0 (not approved)
        mockMvc.perform(get("/api/venues?q=Koramangala"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(0)));

        // Now approve Venue B
        mockMvc.perform(post("/api/admin/facilities/" + idB + "/approve")
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk());

        // Test 5: Search "bengaluru" now returns both venues
        mockMvc.perform(get("/api/venues?q=bengaluru"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(2)));

        // Test 6: Filter by sport "BADMINTON" -> returns only Venue A
        mockMvc.perform(get("/api/venues?sport=BADMINTON"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(1)))
                .andExpect(jsonPath("$[0].name").value("Electronic City Sports Park"));

        // Test 7: Filter by sport "TENNIS" -> returns only Venue B
        mockMvc.perform(get("/api/venues?sport=TENNIS"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(1)))
                .andExpect(jsonPath("$[0].name").value("Koramangala Tennis Center"));

        // Test 8: Filter by minRating 4.7 -> returns only Venue A (4.8 >= 4.7)
        mockMvc.perform(get("/api/venues?minRating=4.7"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(1)))
                .andExpect(jsonPath("$[0].name").value("Electronic City Sports Park"));

        // Test 9: Non-matching location returns empty array cleanly
        mockMvc.perform(get("/api/venues?q=NonExistentCityXYZ"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(0)));
    }
}
