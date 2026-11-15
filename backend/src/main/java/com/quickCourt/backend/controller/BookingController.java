package com.quickCourt.backend.controller;

import com.quickCourt.backend.dto.BookingRequest;
import com.quickCourt.backend.dto.BookingResponse;
import com.quickCourt.backend.entity.User;
import com.quickCourt.backend.service.BookingService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping({"/api/bookings", "/bookings"})
public class BookingController {

    private final BookingService bookingService;

    public BookingController(BookingService bookingService) {
        this.bookingService = bookingService;
    }

    @PostMapping
    public ResponseEntity<BookingResponse> createBooking(
            @Valid @RequestBody BookingRequest request,
            @AuthenticationPrincipal User currentUser) {

        return new ResponseEntity<>(
                bookingService.createBooking(request, currentUser),
                HttpStatus.CREATED
        );
    }

    @GetMapping({"/me", "/my-bookings", "/user"})
    public ResponseEntity<List<BookingResponse>> getMyBookings(
            @AuthenticationPrincipal User currentUser) {

        return ResponseEntity.ok(
                bookingService.getMyBookings(currentUser)
        );
    }

    @GetMapping("/{id}")
    public ResponseEntity<BookingResponse> getBooking(
            @PathVariable Long id,
            @AuthenticationPrincipal User currentUser) {

        return ResponseEntity.ok(
                bookingService.getBookingById(id, currentUser)
        );
    }

    @PostMapping("/{bookingId}/cancel")
    public ResponseEntity<BookingResponse> cancelBookingPost(
            @PathVariable Long bookingId,
            @AuthenticationPrincipal User currentUser) {

        return ResponseEntity.ok(
                bookingService.cancelBooking(bookingId, currentUser)
        );
    }

    @PutMapping("/{bookingId}/cancel")
    public ResponseEntity<BookingResponse> cancelBookingPut(
            @PathVariable Long bookingId,
            @AuthenticationPrincipal User currentUser) {

        return ResponseEntity.ok(
                bookingService.cancelBooking(bookingId, currentUser)
        );
    }

    @PatchMapping("/{bookingId}/status")
    public ResponseEntity<BookingResponse> updateBookingStatusPatch(
            @PathVariable Long bookingId,
            @RequestBody java.util.Map<String, String> body,
            @AuthenticationPrincipal User currentUser) {
        String status = body != null ? body.get("status") : null;
        if (status == null || status.isBlank()) {
            throw new IllegalArgumentException("Status is required");
        }
        return ResponseEntity.ok(bookingService.updateBookingStatus(bookingId, status, currentUser));
    }

    @PutMapping("/{bookingId}/status")
    public ResponseEntity<BookingResponse> updateBookingStatusPut(
            @PathVariable Long bookingId,
            @RequestBody java.util.Map<String, String> body,
            @AuthenticationPrincipal User currentUser) {
        String status = body != null ? body.get("status") : null;
        if (status == null || status.isBlank()) {
            throw new IllegalArgumentException("Status is required");
        }
        return ResponseEntity.ok(bookingService.updateBookingStatus(bookingId, status, currentUser));
    }

    @PostMapping({"/{bookingId}/release", "/{bookingId}/hold/cancel"})
    public ResponseEntity<BookingResponse> releaseHold(
            @PathVariable Long bookingId,
            @AuthenticationPrincipal User currentUser) {

        return ResponseEntity.ok(
                bookingService.cancelPendingHold(bookingId, currentUser)
        );
    }

    @GetMapping("/user/{userId}")
    public ResponseEntity<List<BookingResponse>> getBookingsByUser(
            @PathVariable Long userId,
            @AuthenticationPrincipal User currentUser) {

        return ResponseEntity.ok(
                bookingService.getBookingsByUser(userId, currentUser)
        );
    }

    @GetMapping("/court/{courtId}")
    public ResponseEntity<List<BookingResponse>> getBookingsByCourt(
            @PathVariable Long courtId,
            @AuthenticationPrincipal User currentUser) {

        return ResponseEntity.ok(
                bookingService.getBookingsByCourt(courtId, currentUser)
        );
    }
}
