package com.quickCourt.backend.repository;

import com.quickCourt.backend.entity.PasswordResetOtp;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

public interface PasswordResetOtpRepository extends JpaRepository<PasswordResetOtp, Long> {

    Optional<PasswordResetOtp> findTopByEmailIgnoreCaseAndUsedFalseOrderByCreatedAtDesc(String email);

    Optional<PasswordResetOtp> findByResetTokenAndUsedFalse(String resetToken);

    List<PasswordResetOtp> findByEmailIgnoreCaseAndCreatedAtAfter(String email, LocalDateTime after);
}
