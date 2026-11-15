package com.quickCourt.backend.service;

import com.quickCourt.backend.dto.ForgotPasswordRequest;
import com.quickCourt.backend.dto.ResetPasswordRequest;
import com.quickCourt.backend.dto.VerifyOtpRequest;
import com.quickCourt.backend.entity.PasswordResetOtp;
import com.quickCourt.backend.entity.User;
import com.quickCourt.backend.repository.PasswordResetOtpRepository;
import com.quickCourt.backend.repository.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.util.*;

@Service
@Transactional
public class PasswordResetService {

    private static final Logger log = LoggerFactory.getLogger(PasswordResetService.class);
    private static final SecureRandom secureRandom = new SecureRandom();

    private final PasswordResetOtpRepository otpRepository;
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    @Value("${spring.profiles.active:dev}")
    private String activeProfile;

    public PasswordResetService(PasswordResetOtpRepository otpRepository,
                                UserRepository userRepository,
                                PasswordEncoder passwordEncoder) {
        this.otpRepository = otpRepository;
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
    }

    /**
     * STEP 1: Generates a cryptographically random 6-digit OTP, hashes it, and stores it with a 5-minute expiry.
     * Generic response is returned regardless of email existence to prevent user enumeration.
     */
    public Map<String, Object> requestOtp(ForgotPasswordRequest request) {
        String email = request.getNormalizedEmail();
        if (email.isBlank()) {
            throw new IllegalArgumentException("Valid email address is required");
        }

        LocalDateTime now = LocalDateTime.now();

        // 1. Rate Limiting: Max 5 requests in 15 minutes per email
        List<PasswordResetOtp> recentRequests = otpRepository.findByEmailIgnoreCaseAndCreatedAtAfter(email, now.minusMinutes(15));
        if (recentRequests.size() >= 5) {
            log.warn("[AUTH-DIAG] OTP rate limit exceeded for email: {}", maskEmail(email));
            throw new IllegalArgumentException("Too many OTP requests. Please wait a few minutes before trying again.");
        }

        // 2. Cooldown: Minimum 60 seconds between resend requests
        Optional<PasswordResetOtp> optLatest = otpRepository.findTopByEmailIgnoreCaseAndUsedFalseOrderByCreatedAtDesc(email);
        if (optLatest.isPresent()) {
            PasswordResetOtp latest = optLatest.get();
            LocalDateTime refTime = latest.getLastResentAt() != null ? latest.getLastResentAt() : latest.getCreatedAt();
            if (refTime.isAfter(now.minusSeconds(60))) {
                long secondsLeft = java.time.Duration.between(now.minusSeconds(60), refTime).abs().getSeconds();
                throw new IllegalArgumentException("Please wait " + (secondsLeft > 0 ? secondsLeft : 60) + " seconds before requesting a new code.");
            }
        }

        // 3. User existence check (Security: do not reveal if email is registered)
        Optional<User> optUser = userRepository.findByEmailIgnoreCase(email);
        if (optUser.isEmpty()) {
            log.info("[AUTH-DIAG] Password reset requested for non-existent email: {}. Returning generic response.", maskEmail(email));
            return Map.of(
                    "message", "If an account exists with this email, a 6-digit verification code has been sent.",
                    "email", email,
                    "cooldownSeconds", 60
            );
        }

        // 4. Generate secure 6-digit OTP (100000 - 999999)
        int codeInt = 100000 + secureRandom.nextInt(900000);
        String plainOtp = String.valueOf(codeInt);

        // 5. Store only BCrypt hashed OTP
        String otpHashed = passwordEncoder.encode(plainOtp);

        PasswordResetOtp otpEntity = new PasswordResetOtp();
        otpEntity.setEmail(email);
        otpEntity.setOtpHashed(otpHashed);
        otpEntity.setExpiresAt(now.plusMinutes(5));
        otpEntity.setCreatedAt(now);
        otpEntity.setLastResentAt(now);
        otpEntity.setAttemptCount(0);
        otpEntity.setVerified(false);
        otpEntity.setUsed(false);

        otpRepository.save(otpEntity);

        // 6. Development-Only Delivery Mechanism: Expose through console log
        log.info("[OTP-DEV-DELIVERY] 🔑 Password reset verification code for {}: {} (Valid for 5 minutes)",
                maskEmail(email), plainOtp);

        Map<String, Object> response = new HashMap<>();
        response.put("message", "If an account exists with this email, a 6-digit verification code has been sent.");
        response.put("email", email);
        response.put("expiresInMinutes", 5);
        response.put("cooldownSeconds", 60);

        // Expose devOtp only for local development profile to allow seamless manual/automated testing
        if ("dev".equalsIgnoreCase(activeProfile)) {
            response.put("devOtp", plainOtp);
        }

        return response;
    }

    /**
     * STEP 2: Validates the 6-digit OTP against the stored BCrypt hash.
     * Enforces expiry, max 5 attempts, and one-time use.
     */
    public Map<String, Object> verifyOtp(VerifyOtpRequest request) {
        String email = request.getNormalizedEmail();
        String plainOtp = request.getOtp() != null ? request.getOtp().trim() : "";

        if (email.isBlank() || plainOtp.isBlank()) {
            throw new IllegalArgumentException("Email and 6-digit OTP are required");
        }

        PasswordResetOtp otpEntity = otpRepository.findTopByEmailIgnoreCaseAndUsedFalseOrderByCreatedAtDesc(email)
                .orElseThrow(() -> new IllegalArgumentException("No active verification code found for this email. Please request a new code."));

        LocalDateTime now = LocalDateTime.now();

        // Check if expired
        if (otpEntity.getExpiresAt().isBefore(now)) {
            log.warn("[AUTH-DIAG] Expired OTP verification attempt for {}", maskEmail(email));
            throw new IllegalArgumentException("This verification code has expired. Please request a new code.");
        }

        // Check attempt count
        if (otpEntity.getAttemptCount() >= 5) {
            otpEntity.setUsed(true);
            otpRepository.save(otpEntity);
            log.warn("[AUTH-DIAG] OTP exceeded max attempts for {}", maskEmail(email));
            throw new IllegalArgumentException("Too many incorrect attempts. This code has been invalidated. Please request a new code.");
        }

        // Verify hash
        boolean matches = passwordEncoder.matches(plainOtp, otpEntity.getOtpHashed());
        if (!matches) {
            int newCount = otpEntity.getAttemptCount() + 1;
            otpEntity.setAttemptCount(newCount);
            otpRepository.save(otpEntity);
            int remaining = Math.max(0, 5 - newCount);
            log.warn("[AUTH-DIAG] Incorrect OTP entered for {}. Attempts remaining: {}", maskEmail(email), remaining);
            throw new IllegalArgumentException("Incorrect verification code. " + remaining + " attempt(s) remaining.");
        }

        // Valid OTP: issue a one-time reset token (valid for 10 minutes)
        String resetToken = "RST_" + UUID.randomUUID().toString().replace("-", "");
        otpEntity.setVerified(true);
        otpEntity.setResetToken(resetToken);
        otpEntity.setResetTokenExpiresAt(now.plusMinutes(10));
        otpRepository.save(otpEntity);

        log.info("[AUTH-DIAG] OTP successfully verified for {}", maskEmail(email));

        return Map.of(
                "message", "Verification code confirmed successfully.",
                "email", email,
                "resetToken", resetToken
        );
    }

    /**
     * STEP 3: Resets the user's password using the verified resetToken.
     * Enforces password confirmation, strength, BCrypt hashing, and invalidates the token.
     */
    public Map<String, Object> resetPassword(ResetPasswordRequest request) {
        String email = request.getNormalizedEmail();
        String resetToken = request.getResetToken() != null ? request.getResetToken().trim() : "";
        String newPassword = request.getNewPassword();
        String confirmPassword = request.getConfirmPassword();

        if (email.isBlank() || resetToken.isBlank() || newPassword == null || newPassword.isBlank()) {
            throw new IllegalArgumentException("All fields are required to reset your password");
        }

        if (confirmPassword != null && !confirmPassword.isBlank() && !newPassword.equals(confirmPassword)) {
            throw new IllegalArgumentException("Passwords do not match");
        }

        if (newPassword.length() < 6) {
            throw new IllegalArgumentException("Password must be at least 6 characters long");
        }

        // Validate resetToken
        PasswordResetOtp otpEntity = otpRepository.findByResetTokenAndUsedFalse(resetToken)
                .orElseThrow(() -> new IllegalArgumentException("Invalid or expired password reset session. Please request a new code."));

        if (!otpEntity.getEmail().equalsIgnoreCase(email)) {
            throw new IllegalArgumentException("Reset session does not match the provided email");
        }

        if (!otpEntity.isVerified()) {
            throw new IllegalArgumentException("OTP has not been verified yet");
        }

        if (otpEntity.getResetTokenExpiresAt() != null && otpEntity.getResetTokenExpiresAt().isBefore(LocalDateTime.now())) {
            throw new IllegalArgumentException("Password reset session has expired. Please request a new code.");
        }

        // Retrieve user
        User user = userRepository.findByEmailIgnoreCase(email)
                .orElseThrow(() -> new IllegalArgumentException("User account not found"));

        // Update password with BCrypt hash
        user.setPassword(passwordEncoder.encode(newPassword));
        userRepository.save(user);

        // Invalidate OTP and resetToken immediately (one-time use)
        otpEntity.setUsed(true);
        otpRepository.save(otpEntity);

        log.info("[AUTH-DIAG] Password reset completed successfully for userId={}, email={}",
                user.getId(), maskEmail(email));

        return Map.of(
                "message", "Password reset successful! You can now log in with your new password.",
                "email", email
        );
    }

    private String maskEmail(String email) {
        if (email == null || email.isBlank()) return "[empty]";
        int atIndex = email.indexOf('@');
        if (atIndex <= 1) return "***" + (atIndex >= 0 ? email.substring(atIndex) : "");
        return email.charAt(0) + "***" + email.substring(atIndex - 1);
    }
}
