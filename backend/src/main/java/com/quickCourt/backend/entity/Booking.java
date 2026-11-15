package com.quickCourt.backend.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;

@Entity
@Getter
@Setter
public class Booking {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(optional = false, fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @ManyToOne(optional = false, fetch = FetchType.LAZY)
    @JoinColumn(name = "court_id", nullable = false)
    private Court court;

    @Column(nullable = false)
    private LocalDate bookingDate;

    @Column(nullable = false)
    private LocalTime startTime;

    @Column(nullable = false)
    private LocalTime endTime;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private BookingStatus status;

    @Column(nullable = false, precision = 10, scale = 2)
    private BigDecimal totalPrice;

    @Column(nullable = false)
    private String paymentStatus = "PENDING"; // PENDING, SUCCESS, FAILED, EXPIRED

    private String paymentMethod;

    private String transactionId;

    private String razorpayOrderId;

    private String razorpayPaymentId;

    @Column(length = 500)
    private String razorpaySignature;

    private LocalDateTime holdExpiresAt;

    private String refundStatus;

    private String refundId;

    @Column(nullable = false)
    private LocalDateTime createdAt = LocalDateTime.now();
}
