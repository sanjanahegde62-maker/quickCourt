package com.quickCourt.backend.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;

@Entity
@Table(name = "password_reset_otps", indexes = {
        @Index(name = "idx_otp_email", columnList = "email"),
        @Index(name = "idx_otp_reset_token", columnList = "resetToken")
})
@Getter
@Setter
@NoArgsConstructor
public class PasswordResetOtp {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 150)
    private String email;

    @Column(nullable = false, length = 200)
    private String otpHashed;

    @Column(nullable = false)
    private LocalDateTime expiresAt;

    @Column(nullable = false)
    private LocalDateTime createdAt = LocalDateTime.now();

    private LocalDateTime lastResentAt;

    @Column(nullable = false)
    private int attemptCount = 0;

    @Column(nullable = false)
    private boolean verified = false;

    @Column(nullable = false)
    private boolean used = false;

    @Column(length = 100)
    private String resetToken;

    private LocalDateTime resetTokenExpiresAt;
}
