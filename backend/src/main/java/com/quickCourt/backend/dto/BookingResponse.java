package com.quickCourt.backend.dto;

import com.quickCourt.backend.entity.BookingStatus;
import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;

@Getter
@Setter
public class BookingResponse {

    private Long id;
    private Long bookingId;
    private String reference;

    private Long userId;
    private String userName;
    private String playerName;
    private String userEmail;
    private String playerEmail;

    private Long courtId;
    private String courtName;
    private String sport;
    private String sportType;
    private Integer durationMinutes;

    private Long venueId;
    private Long facilityId;
    private String venueName;
    private String facilityName;

    private LocalDate bookingDate;
    private LocalDate date;

    private LocalTime startTime;
    private LocalTime endTime;

    private BookingStatus status;
    private String paymentStatus;
    private String paymentMethod;
    private String transactionId;

    private String razorpayOrderId;
    private String razorpayKeyId;
    @com.fasterxml.jackson.annotation.JsonFormat(shape = com.fasterxml.jackson.annotation.JsonFormat.Shape.STRING, pattern = "yyyy-MM-dd'T'HH:mm:ss'Z'")
    private LocalDateTime holdExpiresAt;
    private boolean gatewayConfigured;
    private String gatewayMessage;

    private BigDecimal totalPrice;
    private BigDecimal totalAmount;
    private BigDecimal amount;

    private LocalDateTime createdAt;
}
