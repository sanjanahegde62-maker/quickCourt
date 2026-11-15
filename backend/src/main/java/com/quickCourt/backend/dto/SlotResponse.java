package com.quickCourt.backend.dto;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class SlotResponse {
    private String slotId;
    private Long courtId;
    private LocalDate date;
    private LocalTime startTime;
    private LocalTime endTime;
    private Integer duration; // in minutes
    private BigDecimal price;
    private String status; // AVAILABLE, BOOKED, HELD, PAST
    private boolean available;
    private LocalDateTime holdExpiresAt;

    public SlotResponse(String slotId, Long courtId, LocalDate date, LocalTime startTime, LocalTime endTime,
                        BigDecimal price, String status, boolean available) {
        this.slotId = slotId;
        this.courtId = courtId;
        this.date = date;
        this.startTime = startTime;
        this.endTime = endTime;
        this.duration = 60;
        this.price = price;
        this.status = status;
        this.available = available;
    }
}
