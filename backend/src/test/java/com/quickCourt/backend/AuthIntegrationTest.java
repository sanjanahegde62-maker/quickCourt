package com.quickCourt.backend;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.SerializationFeature;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import com.quickCourt.backend.dto.AuthResponse;
import com.quickCourt.backend.dto.LoginRequest;
import com.quickCourt.backend.dto.RegisterRequest;
import com.quickCourt.backend.dto.UpdateProfileRequest;
import com.quickCourt.backend.entity.Role;
import com.quickCourt.backend.repository.BookingRepository;
import com.quickCourt.backend.repository.CourtRepository;
import com.quickCourt.backend.repository.UserRepository;
import com.quickCourt.backend.repository.VenueRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.context.WebApplicationContext;
import com.quickCourt.backend.config.JwtService;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.util.Date;

import static org.hamcrest.Matchers.*;
import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.security.test.web.servlet.setup.SecurityMockMvcConfigurers.springSecurity;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
class AuthIntegrationTest {

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
    private JwtService jwtService;

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders.webAppContextSetup(webApplicationContext)
                .apply(springSecurity())
                .build();
        bookingRepository.deleteAll();
        courtRepository.deleteAll();
        venueRepository.deleteAll();
        userRepository.deleteAll();
    }

    @Test
    void registerPlayer_success() throws Exception {
        RegisterRequest req = new RegisterRequest();
        req.setFullName("John Doe");
        req.setEmail("john@example.com");
        req.setPassword("password123");
        req.setRole(Role.USER);

        mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.token").isNotEmpty())
                .andExpect(jsonPath("$.user.email").value("john@example.com"))
                .andExpect(jsonPath("$.user.role").value("USER"));
    }

    @Test
    void registerOwner_success() throws Exception {
        RegisterRequest req = new RegisterRequest();
        req.setName("Owner Bob");
        req.setEmail("bob@owner.com");
        req.setPassword("password123");
        req.setRole("OWNER");

        mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.token").isNotEmpty())
                .andExpect(jsonPath("$.user.role").value("FACILITY_OWNER"));
    }

    @Test
    void registerAdmin_rejected() throws Exception {
        RegisterRequest req = new RegisterRequest();
        req.setName("Hacker Admin");
        req.setEmail("hacker@admin.com");
        req.setPassword("password123");
        req.setRole("ADMIN");

        mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value(containsString("Administrator role cannot be assigned")));
    }

    @Test
    void registerDuplicateEmail_returnsConflict409() throws Exception {
        RegisterRequest req = new RegisterRequest();
        req.setName("John Doe");
        req.setEmail("john@example.com");
        req.setPassword("password123");
        req.setRole(Role.USER);

        mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isCreated());

        // Attempt second registration with same email
        mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.message").value(containsString("john@example.com")));
    }

    @Test
    void immediateLoginAfterRegistration_withExactCredentials_authenticatesProtectedEndpoint() throws Exception {
        // 1. Register a new user
        RegisterRequest req = new RegisterRequest();
        req.setName("Fresh Player");
        req.setEmail("freshplayer@example.com");
        req.setPassword("Password123!");
        req.setRole(Role.USER);

        mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.token").isNotEmpty());

        // 2. Immediately log in with the exact same credentials
        LoginRequest login = new LoginRequest();
        login.setEmail("freshplayer@example.com");
        login.setPassword("Password123!");

        MvcResult loginResult = mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(login)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.token").isNotEmpty())
                .andExpect(jsonPath("$.user.email").value("freshplayer@example.com"))
                .andExpect(jsonPath("$.user.role").value("USER"))
                .andReturn();

        AuthResponse authResponse = objectMapper.readValue(loginResult.getResponse().getContentAsString(), AuthResponse.class);
        assertNotNull(authResponse.getToken());

        // 3. Verify returned JWT can authenticate a protected endpoint (/api/users/me)
        mockMvc.perform(get("/api/users/me")
                        .header("Authorization", "Bearer " + authResponse.getToken()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.email").value("freshplayer@example.com"))
                .andExpect(jsonPath("$.name").value("Fresh Player"));
    }

    @Test
    void loginWithWrongPassword_returnsUnauthorized401() throws Exception {
        RegisterRequest req = new RegisterRequest();
        req.setName("Alice Walker");
        req.setEmail("alice@example.com");
        req.setPassword("secret123");
        req.setRole(Role.USER);

        mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isCreated());

        LoginRequest login = new LoginRequest();
        login.setEmail("alice@example.com");
        login.setPassword("wrongpassword");

        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(login)))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void loginWithEmailNormalization_whitespaceAndCasing_succeeds() throws Exception {
        RegisterRequest req = new RegisterRequest();
        req.setName("Normalizer User");
        req.setEmail("norm@example.com");
        req.setPassword("PassWord123");
        req.setRole(Role.USER);

        mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isCreated());

        // Login with leading/trailing spaces and mixed uppercase letters in email
        LoginRequest login = new LoginRequest();
        login.setEmail("   Norm@EXAMPLE.COM   ");
        login.setPassword("PassWord123");

        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(login)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.token").isNotEmpty())
                .andExpect(jsonPath("$.user.email").value("norm@example.com"));
    }

    @Test
    void registerWithEmailWhitespace_trimsAndNormalizes() throws Exception {
        RegisterRequest req = new RegisterRequest();
        req.setName("Whitespace User");
        req.setEmail("   spacey@example.com   ");
        req.setPassword("PassWord123");
        req.setRole(Role.USER);

        mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.user.email").value("spacey@example.com"));

        // User should be findable with clean lowercase email
        assertTrue(userRepository.findByEmail("spacey@example.com").isPresent());

        // Login with exact clean email
        LoginRequest login = new LoginRequest();
        login.setEmail("spacey@example.com");
        login.setPassword("PassWord123");

        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(login)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.token").isNotEmpty());
    }

    @Test
    void unauthenticatedAccessToProtectedEndpoint_returns401() throws Exception {
        mockMvc.perform(get("/api/users/me"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void subsequentRequestsWithinSameInstance_maintainSessionAndState() throws Exception {
        // Register User A
        RegisterRequest userA = new RegisterRequest();
        userA.setName("User Alpha");
        userA.setEmail("alpha@example.com");
        userA.setPassword("AlphaPass123");
        userA.setRole(Role.USER);

        mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(userA)))
                .andExpect(status().isCreated());

        // Register User B
        RegisterRequest userB = new RegisterRequest();
        userB.setName("User Beta");
        userB.setEmail("beta@example.com");
        userB.setPassword("BetaPass123");
        userB.setRole(Role.USER);

        mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(userB)))
                .andExpect(status().isCreated());

        // Login User A
        LoginRequest loginA = new LoginRequest();
        loginA.setEmail("alpha@example.com");
        loginA.setPassword("AlphaPass123");

        MvcResult resultA = mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(loginA)))
                .andExpect(status().isOk())
                .andReturn();
        String tokenA = objectMapper.readTree(resultA.getResponse().getContentAsString()).get("token").asText();

        // Login User B
        LoginRequest loginB = new LoginRequest();
        loginB.setEmail("beta@example.com");
        loginB.setPassword("BetaPass123");

        MvcResult resultB = mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(loginB)))
                .andExpect(status().isOk())
                .andReturn();
        String tokenB = objectMapper.readTree(resultB.getResponse().getContentAsString()).get("token").asText();

        // Call /me with token A -> returns Alpha
        mockMvc.perform(get("/api/users/me").header("Authorization", "Bearer " + tokenA))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.email").value("alpha@example.com"))
                .andExpect(jsonPath("$.name").value("User Alpha"));

        // Call /me with token B -> returns Beta
        mockMvc.perform(get("/api/users/me").header("Authorization", "Bearer " + tokenB))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.email").value("beta@example.com"))
                .andExpect(jsonPath("$.name").value("User Beta"));

        // Re-login User A -> verifies state persists across subsequent HTTP requests
        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(loginA)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.user.email").value("alpha@example.com"));
    }

    @Test
    void getCurrentUserAndProfileUpdate_success() throws Exception {
        RegisterRequest req = new RegisterRequest();
        req.setName("Carol Danvers");
        req.setEmail("carol@example.com");
        req.setPassword("supersecret");
        req.setRole(Role.USER);

        MvcResult result = mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isCreated())
                .andReturn();

        String token = objectMapper.readTree(result.getResponse().getContentAsString()).get("token").asText();

        // Access /api/users/me with Bearer token
        mockMvc.perform(get("/api/users/me")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.email").value("carol@example.com"))
                .andExpect(jsonPath("$.role").value("USER"));

        // Update profile
        UpdateProfileRequest update = new UpdateProfileRequest();
        update.setName("Carol Marvel");
        update.setPhone("+91 9876543210");

        mockMvc.perform(patch("/api/users/me")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(update)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.name").value("Carol Marvel"))
                .andExpect(jsonPath("$.phone").value("+91 9876543210"))
                .andExpect(jsonPath("$.role").value("USER"));
    }

    @Test
    void loginWithNonexistentEmail_returnsUnauthorized401() throws Exception {
        LoginRequest login = new LoginRequest();
        login.setEmail("ghost.player@doesnotexist.com");
        login.setPassword("somePassword123");

        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(login)))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.message").value(containsString("email or password")));
    }

    @Test
    void loginWithBannedAccount_returnsBadRequest400() throws Exception {
        RegisterRequest req = new RegisterRequest();
        req.setName("Bad Actor");
        req.setEmail("badactor@example.com");
        req.setPassword("Password123");
        req.setRole(Role.USER);

        mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isCreated());

        // Mark user as BANNED
        com.quickCourt.backend.entity.User user = userRepository.findByEmailIgnoreCase("badactor@example.com").orElseThrow();
        user.setStatus("BANNED");
        userRepository.save(user);

        LoginRequest login = new LoginRequest();
        login.setEmail("badactor@example.com");
        login.setPassword("Password123");

        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(login)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value(containsString("account is not active")));
    }

    @Test
    void emailUniquenessAndCaseInsensitiveLookup() throws Exception {
        RegisterRequest req = new RegisterRequest();
        req.setName("Case Tester");
        req.setEmail("Case.Sensitive@Domain.COM");
        req.setPassword("SecurePass123");
        req.setRole(Role.USER);

        mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.user.email").value("case.sensitive@domain.com"));

        // Attempt duplicate registration in lowercase
        RegisterRequest dup = new RegisterRequest();
        dup.setName("Case Tester Duplicate");
        dup.setEmail("case.sensitive@domain.com");
        dup.setPassword("SecurePass123");
        dup.setRole(Role.USER);

        mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(dup)))
                .andExpect(status().isConflict());

        // Login with uppercase email
        LoginRequest login = new LoginRequest();
        login.setEmail("CASE.SENSITIVE@DOMAIN.COM");
        login.setPassword("SecurePass123");

        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(login)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.token").isNotEmpty())
                .andExpect(jsonPath("$.user.email").value("case.sensitive@domain.com"));
    }

    @Test
    void oldExposedSecretToken_isInvalidatedUnderRotatedSecret() throws Exception {
        // Build a token signed with the old, exposed secret
        String oldExposedSecret = "404E635266556A586E3272357538782F413F4428472B4B6250645367566B5970";
        SecretKey oldKey = Keys.hmacShaKeyFor(oldExposedSecret.getBytes(StandardCharsets.UTF_8));
        Date now = new Date();
        Date expiry = new Date(now.getTime() + 86400000);

        String legacyToken = Jwts.builder()
                .subject("legacy.user@example.com")
                .claim("userId", 999L)
                .claim("role", "USER")
                .claim("name", "Legacy User")
                .issuedAt(now)
                .expiration(expiry)
                .signWith(oldKey)
                .compact();

        // 1. JwtService should reject validation of old token
        assertFalse(jwtService.validateToken(legacyToken), "Token signed with exposed secret must fail validation");

        // 2. Protected endpoint must return HTTP 401 Unauthorized
        mockMvc.perform(get("/api/users/me")
                        .header("Authorization", "Bearer " + legacyToken))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void jwtServiceConstructor_validatesSecretSecurity() {
        // Missing or short secrets must throw IllegalStateException
        assertThrows(IllegalStateException.class, () -> new JwtService("", 86400000));
        assertThrows(IllegalStateException.class, () -> new JwtService("too_short_key", 86400000));
        assertThrows(IllegalStateException.class, () -> new JwtService(null, 86400000));

        // Secure secret (>= 32 chars) must succeed
        JwtService validService = new JwtService("qc_test_rotated_secret_key_minimum_256_bits_for_tests_only_9a8b7c6d5e", 86400000);
        assertNotNull(validService);
    }
}
