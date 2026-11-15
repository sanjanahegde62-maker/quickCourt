package com.quickCourt.backend.controller;

import com.quickCourt.backend.dto.AuthResponse;
import com.quickCourt.backend.dto.ForgotPasswordRequest;
import com.quickCourt.backend.dto.LoginRequest;
import com.quickCourt.backend.dto.RegisterRequest;
import com.quickCourt.backend.dto.ResetPasswordRequest;
import com.quickCourt.backend.dto.UpdateProfileRequest;
import com.quickCourt.backend.dto.UserResponse;
import com.quickCourt.backend.dto.VerifyOtpRequest;
import com.quickCourt.backend.entity.User;
import com.quickCourt.backend.service.PasswordResetService;
import com.quickCourt.backend.service.UserService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping({"/api/users", "/api/auth"})
public class UserController {

    private final UserService userService;
    private final PasswordResetService passwordResetService;

    public UserController(UserService userService, PasswordResetService passwordResetService) {
        this.userService = userService;
        this.passwordResetService = passwordResetService;
    }

    @PostMapping("/register")
    public ResponseEntity<AuthResponse> register(@Valid @RequestBody RegisterRequest request) {
        AuthResponse response = userService.register(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @PostMapping("/login")
    public ResponseEntity<AuthResponse> login(@Valid @RequestBody LoginRequest request) {
        return ResponseEntity.ok(userService.login(request));
    }

    @PostMapping({"/forgot-password/request", "/otp/request"})
    public ResponseEntity<Map<String, Object>> requestPasswordResetOtp(@Valid @RequestBody ForgotPasswordRequest request) {
        return ResponseEntity.ok(passwordResetService.requestOtp(request));
    }

    @PostMapping({"/forgot-password/verify", "/otp/verify"})
    public ResponseEntity<Map<String, Object>> verifyPasswordResetOtp(@Valid @RequestBody VerifyOtpRequest request) {
        return ResponseEntity.ok(passwordResetService.verifyOtp(request));
    }

    @PostMapping({"/forgot-password/reset", "/reset-password"})
    public ResponseEntity<Map<String, Object>> resetPassword(@Valid @RequestBody ResetPasswordRequest request) {
        return ResponseEntity.ok(passwordResetService.resetPassword(request));
    }

    @GetMapping("/me")
    public ResponseEntity<UserResponse> getCurrentUser(@AuthenticationPrincipal User principal) {
        if (principal == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        return ResponseEntity.ok(userService.getMe(principal.getEmail()));
    }

    @PatchMapping("/me")
    public ResponseEntity<UserResponse> updateProfile(@AuthenticationPrincipal User principal,
                                                     @RequestBody UpdateProfileRequest request) {
        if (principal == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        return ResponseEntity.ok(userService.updateMe(principal.getEmail(), request));
    }

    @PostMapping("/logout")
    public ResponseEntity<Void> logout() {
        return ResponseEntity.ok().build();
    }
}
