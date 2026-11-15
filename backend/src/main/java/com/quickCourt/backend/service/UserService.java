package com.quickCourt.backend.service;

import com.quickCourt.backend.config.JwtService;
import com.quickCourt.backend.dto.AuthResponse;
import com.quickCourt.backend.dto.LoginRequest;
import com.quickCourt.backend.dto.RegisterRequest;
import com.quickCourt.backend.dto.UpdateProfileRequest;
import com.quickCourt.backend.dto.UserResponse;
import com.quickCourt.backend.entity.Role;
import com.quickCourt.backend.entity.User;
import com.quickCourt.backend.exception.DuplicateEmailException;
import com.quickCourt.backend.exception.InvalidCredentialsException;
import com.quickCourt.backend.exception.ResourceNotFoundException;
import com.quickCourt.backend.repository.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Optional;

@Service
@Transactional
public class UserService {

    private static final Logger log = LoggerFactory.getLogger(UserService.class);

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;

    @Value("${spring.profiles.active:dev}")
    private String activeProfile;

    @Value("${spring.datasource.url:}")
    private String dbUrl;

    public UserService(UserRepository userRepository,
                       PasswordEncoder passwordEncoder,
                       JwtService jwtService) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtService = jwtService;
    }

    public AuthResponse register(RegisterRequest request) {
        String email = request.getNormalizedEmail();
        if (email.isBlank()) {
            throw new IllegalArgumentException("Email is required");
        }
        if (userRepository.existsByEmailIgnoreCase(email)) {
            log.warn("[AUTH-DIAG] Registration rejected: duplicate email {}", maskEmail(email));
            throw new DuplicateEmailException(email);
        }

        String name = request.resolveFullName();
        if (name.isBlank()) {
            throw new IllegalArgumentException("Full name is required");
        }

        Role role = request.resolveRole();

        User user = new User();
        user.setFullName(name);
        user.setEmail(email);
        user.setPassword(passwordEncoder.encode(request.getPassword()));
        user.setRole(role);
        user.setVerified(false);
        user.setStatus("ACTIVE");

        User saved = userRepository.save(user);
        log.info("[AUTH-DIAG] Registration succeeded: userId={}, email={}, role={}, activeProfile={}, dbUrl={}",
                saved.getId(), maskEmail(saved.getEmail()), saved.getRole(), activeProfile, getSanitizedDbUrl());

        String token = jwtService.generateToken(saved);
        return new AuthResponse(token, token, toResponse(saved));
    }

    public AuthResponse login(LoginRequest request) {
        String email = request.getNormalizedEmail();
        if (email.isBlank()) {
            log.warn("[AUTH-DIAG] Login failed: Empty email provided");
            throw new InvalidCredentialsException();
        }

        Optional<User> optUser = userRepository.findByEmailIgnoreCase(email);
        if (optUser.isEmpty()) {
            log.warn("[AUTH-DIAG] Login failed: Account not found. email={}, activeProfile={}, dbUrl={}",
                    maskEmail(email), activeProfile, getSanitizedDbUrl());
            throw new InvalidCredentialsException();
        }

        User user = optUser.get();
        boolean passwordMatches = passwordEncoder.matches(request.getPassword(), user.getPassword());
        if (!passwordMatches) {
            log.warn("[AUTH-DIAG] Login failed: Password mismatch. email={}, userId={}, activeProfile={}, dbUrl={}",
                    maskEmail(email), user.getId(), activeProfile, getSanitizedDbUrl());
            throw new InvalidCredentialsException();
        }

        if ("BANNED".equalsIgnoreCase(user.getStatus()) || "INACTIVE".equalsIgnoreCase(user.getStatus())) {
            log.warn("[AUTH-DIAG] Login failed: Account disabled/banned. email={}, status={}",
                    maskEmail(email), user.getStatus());
            throw new IllegalArgumentException("This account is not active. Please contact support.");
        }

        log.info("[AUTH-DIAG] Login succeeded: userId={}, email={}, role={}, activeProfile={}",
                user.getId(), maskEmail(user.getEmail()), user.getRole(), activeProfile);

        String token = jwtService.generateToken(user);
        return new AuthResponse(token, token, toResponse(user));
    }

    public UserResponse getMe(String email) {
        String normalized = email != null ? email.toLowerCase().trim() : "";
        User user = userRepository.findByEmailIgnoreCase(normalized)
                .orElseThrow(() -> new ResourceNotFoundException("User", 0L));
        return toResponse(user);
    }

    public UserResponse updateMe(String email, UpdateProfileRequest request) {
        String normalized = email != null ? email.toLowerCase().trim() : "";
        User user = userRepository.findByEmailIgnoreCase(normalized)
                .orElseThrow(() -> new ResourceNotFoundException("User", 0L));

        String newName = request.getFullName();
        if (newName == null || newName.isBlank()) {
            newName = request.getName();
        }
        if (newName != null && !newName.isBlank()) {
            user.setFullName(newName.trim());
        }
        if (request.getPhone() != null) {
            user.setPhone(request.getPhone().trim());
        }

        return toResponse(userRepository.save(user));
    }

    public UserResponse toResponse(User user) {
        UserResponse response = new UserResponse();
        response.setId(user.getId());
        response.setFullName(user.getFullName());
        response.setName(user.getFullName());
        response.setEmail(user.getEmail());
        response.setRole(user.getRole());
        response.setVerified(user.isVerified());
        response.setPhone(user.getPhone());
        response.setStatus(user.getStatus());
        return response;
    }

    private String maskEmail(String email) {
        if (email == null || email.isBlank()) return "[empty]";
        int atIndex = email.indexOf('@');
        if (atIndex <= 1) return "***" + (atIndex >= 0 ? email.substring(atIndex) : "");
        return email.charAt(0) + "***" + email.substring(atIndex - 1);
    }

    private String getSanitizedDbUrl() {
        if (dbUrl == null || dbUrl.isBlank()) return "[not configured]";
        return dbUrl.replaceAll("(?i)(password|pwd)=[^;&]*", "$1=***");
    }
}
