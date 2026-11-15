package com.quickCourt.backend.dto;

import lombok.Getter;
import lombok.Setter;

import java.time.LocalDate;
import java.time.LocalTime;

@Getter
@Setter
public class BookingRequest {

    private Long userId; // ignored in favor of authenticated identity
    private Long courtId;
    private LocalDate bookingDate;
    private LocalDate date;
    private LocalTime startTime;
    private LocalTime endTime;
    private String slotId;

    public LocalDate resolveDate() {
        if (bookingDate != null) {
            return bookingDate;
        }
        return date;
    }

    public LocalTime resolveStartTime() {
        if (startTime != null) {
            return startTime;
        }
        if (slotId != null) {
            parseSlotId();
        }
        return startTime;
    }

    public LocalTime resolveEndTime() {
        if (endTime != null) {
            return endTime;
        }
        if (slotId != null) {
            parseSlotId();
        }
        return endTime;
    }

    private void parseSlotId() {
        // Expected format: c{courtId}_{date}_{startTime}_{endTime}
        // e.g. c1_2026-11-02_10:00:00_11:00:00 or 10:00-11:00
        if (slotId == null) return;
        try {
            String[] parts = slotId.split("_");
            if (parts.length >= 4) {
                if (startTime == null) startTime = LocalTime.parse(parts[2]);
                if (endTime == null) endTime = LocalTime.parse(parts[3]);
            }
        } catch (Exception ignored) {
        }
    }
}
