package com.quickCourt.backend.dto;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class RazorpayOrderResponse {
    private String orderId;
    private Long amountInPaise;
    private BigDecimal amountInRupees;
    private String currency = "INR";
    private String keyId;
    private Long bookingId;
    @com.fasterxml.jackson.annotation.JsonFormat(shape = com.fasterxml.jackson.annotation.JsonFormat.Shape.STRING, pattern = "yyyy-MM-dd'T'HH:mm:ss'Z'")
    private LocalDateTime holdExpiresAt;
    private boolean configured;
    private String message;

    public boolean isGatewayConfigured() {
        return configured;
    }

    public Long getAmountPaise() {
        return amountInPaise;
    }

    public String getGatewayMessage() {
        return message;
    }
}
