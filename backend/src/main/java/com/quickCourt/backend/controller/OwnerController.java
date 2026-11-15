package com.quickCourt.backend.controller;

import com.quickCourt.backend.dto.*;
import com.quickCourt.backend.entity.Booking;
import com.quickCourt.backend.entity.Court;
import com.quickCourt.backend.entity.User;
import com.quickCourt.backend.entity.Venue;
import com.quickCourt.backend.repository.BookingRepository;
import com.quickCourt.backend.repository.CourtRepository;
import com.quickCourt.backend.repository.VenueRepository;
import com.quickCourt.backend.service.BookingService;
import com.quickCourt.backend.service.CourtService;
import com.quickCourt.backend.service.VenueService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.*;
import java.util.stream.Collectors;

@RestController
@RequestMapping({"/api/owner", "/owner"})
public class OwnerController {

    private final VenueService venueService;
    private final CourtService courtService;
    private final BookingService bookingService;
    private final BookingRepository bookingRepository;
    private final CourtRepository courtRepository;
    private final VenueRepository venueRepository;

    public OwnerController(VenueService venueService,
                           CourtService courtService,
                           BookingService bookingService,
                           BookingRepository bookingRepository,
                           CourtRepository courtRepository,
                           VenueRepository venueRepository) {
        this.venueService = venueService;
        this.courtService = courtService;
        this.bookingService = bookingService;
        this.bookingRepository = bookingRepository;
        this.courtRepository = courtRepository;
        this.venueRepository = venueRepository;
    }

    @GetMapping("/facilities")
    public ResponseEntity<List<VenueResponse>> getOwnerFacilities(@AuthenticationPrincipal User currentUser) {
        return ResponseEntity.ok(venueService.getVenuesByOwner(currentUser.getId()));
    }

    @PostMapping("/facilities")
    public ResponseEntity<VenueResponse> createOwnerFacility(
            @Valid @RequestBody VenueRequest request,
            @AuthenticationPrincipal User currentUser) {

        return ResponseEntity.status(HttpStatus.CREATED)
                .body(venueService.create(request, currentUser));
    }

    @GetMapping("/facilities/{id}")
    public ResponseEntity<VenueResponse> getOwnerFacility(
            @PathVariable Long id,
            @AuthenticationPrincipal User currentUser) {

        Venue venue = venueService.findVenue(id);
        if ((venue.getOwner() == null || !venue.getOwner().getId().equals(currentUser.getId())) && currentUser.getRole() != com.quickCourt.backend.entity.Role.ADMIN) {
            throw new AccessDeniedException("You do not own this facility");
        }
        return ResponseEntity.ok(venueService.toResponse(venue));
    }

    @PatchMapping("/facilities/{id}")
    public ResponseEntity<VenueResponse> patchOwnerFacility(
            @PathVariable Long id,
            @RequestBody VenueRequest request,
            @AuthenticationPrincipal User currentUser) {

        return ResponseEntity.ok(venueService.update(id, request, currentUser));
    }

    @PutMapping("/facilities/{id}")
    public ResponseEntity<VenueResponse> putOwnerFacility(
            @PathVariable Long id,
            @RequestBody VenueRequest request,
            @AuthenticationPrincipal User currentUser) {

        return ResponseEntity.ok(venueService.update(id, request, currentUser));
    }

    @GetMapping("/facilities/{facilityId}/courts")
    public ResponseEntity<List<CourtResponse>> getOwnerCourts(
            @PathVariable Long facilityId,
            @AuthenticationPrincipal User currentUser) {

        Venue venue = venueService.findVenue(facilityId);
        if ((venue.getOwner() == null || !venue.getOwner().getId().equals(currentUser.getId())) && currentUser.getRole() != com.quickCourt.backend.entity.Role.ADMIN) {
            throw new AccessDeniedException("You do not own this facility");
        }
        return ResponseEntity.ok(courtService.getCourtsByVenue(facilityId));
    }

    @PostMapping("/facilities/{facilityId}/courts")
    public ResponseEntity<CourtResponse> createOwnerCourt(
            @PathVariable Long facilityId,
            @Valid @RequestBody CourtRequest request,
            @AuthenticationPrincipal User currentUser) {

        return ResponseEntity.status(HttpStatus.CREATED)
                .body(courtService.createCourt(request, currentUser, facilityId));
    }

    @PatchMapping("/courts/{id}")
    public ResponseEntity<CourtResponse> patchOwnerCourt(
            @PathVariable Long id,
            @RequestBody CourtRequest request,
            @AuthenticationPrincipal User currentUser) {

        return ResponseEntity.ok(courtService.updateCourt(id, request, currentUser));
    }

    @PutMapping("/courts/{id}/availability")
    public ResponseEntity<Void> setOperatingHours(
            @PathVariable Long id,
            @RequestBody Map<String, String> body,
            @AuthenticationPrincipal User currentUser) {

        Court court = courtRepository.findById(id)
                .orElseThrow(() -> new com.quickCourt.backend.exception.ResourceNotFoundException("Court", id));
        Venue venue = court.getVenue();
        if ((venue.getOwner() == null || !venue.getOwner().getId().equals(currentUser.getId())) && currentUser.getRole() != com.quickCourt.backend.entity.Role.ADMIN) {
            throw new AccessDeniedException("You do not own this court");
        }

        String openStr = body.get("openingTime");
        String closeStr = body.get("closingTime");
        if (openStr != null) {
            venue.setOpeningTime(LocalTime.parse(openStr.length() == 5 ? openStr + ":00" : openStr));
        }
        if (closeStr != null) {
            venue.setClosingTime(LocalTime.parse(closeStr.length() == 5 ? closeStr + ":00" : closeStr));
        }
        venueRepository.save(venue);
        return ResponseEntity.ok().build();
    }

    @PostMapping("/courts/{id}/blocks")
    public ResponseEntity<BookingResponse> blockSlot(
            @PathVariable Long id,
            @RequestBody Map<String, String> body,
            @AuthenticationPrincipal User currentUser) {

        LocalDate date = LocalDate.parse(body.get("date"));
        LocalTime start = LocalTime.parse(body.get("startTime"));
        LocalTime end = LocalTime.parse(body.get("endTime"));
        String reason = body.get("reason");

        return ResponseEntity.status(HttpStatus.CREATED)
                .body(bookingService.blockCourtSlot(id, date, start, end, reason, currentUser));
    }

    @GetMapping("/bookings")
    public ResponseEntity<List<BookingResponse>> getOwnerBookings(@AuthenticationPrincipal User currentUser) {
        venueService.attachDemoVenuesIfNoneOwned(currentUser);
        return ResponseEntity.ok(bookingService.getOwnerBookings(currentUser));
    }

    @GetMapping("/bookings/{id}")
    public ResponseEntity<BookingResponse> getOwnerBooking(
            @PathVariable Long id,
            @AuthenticationPrincipal User currentUser) {
        venueService.attachDemoVenuesIfNoneOwned(currentUser);
        return ResponseEntity.ok(bookingService.getBookingById(id, currentUser));
    }

    @PatchMapping("/bookings/{id}/status")
    public ResponseEntity<BookingResponse> patchOwnerBookingStatus(
            @PathVariable Long id,
            @RequestBody Map<String, String> body,
            @AuthenticationPrincipal User currentUser) {
        String status = body != null ? body.get("status") : null;
        if (status == null || status.isBlank()) {
            throw new IllegalArgumentException("Status is required");
        }
        return ResponseEntity.ok(bookingService.updateBookingStatus(id, status, currentUser));
    }

    @PutMapping("/bookings/{id}/status")
    public ResponseEntity<BookingResponse> putOwnerBookingStatus(
            @PathVariable Long id,
            @RequestBody Map<String, String> body,
            @AuthenticationPrincipal User currentUser) {
        String status = body != null ? body.get("status") : null;
        if (status == null || status.isBlank()) {
            throw new IllegalArgumentException("Status is required");
        }
        return ResponseEntity.ok(bookingService.updateBookingStatus(id, status, currentUser));
    }

    @PostMapping("/bookings/{id}/cancel")
    public ResponseEntity<BookingResponse> cancelOwnerBooking(
            @PathVariable Long id,
            @AuthenticationPrincipal User currentUser) {
        return ResponseEntity.ok(bookingService.cancelBooking(id, currentUser));
    }

    @GetMapping("/analytics")
    public ResponseEntity<Map<String, Object>> getOwnerAnalytics(@AuthenticationPrincipal User currentUser) {
        venueService.attachDemoVenuesIfNoneOwned(currentUser);
        List<Booking> bookings = bookingRepository.findByCourtVenueOwnerIdOrderByBookingDateDescStartTimeDesc(currentUser.getId());
        long totalBookings = bookings.size();

        BigDecimal revenue = bookings.stream()
                .filter(b -> b.getStatus() == com.quickCourt.backend.entity.BookingStatus.CONFIRMED || b.getStatus() == com.quickCourt.backend.entity.BookingStatus.COMPLETED)
                .map(Booking::getTotalPrice)
                .filter(Objects::nonNull)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        long activeCourts = courtRepository.findAll().stream()
                .filter(c -> c.getVenue() != null && c.getVenue().getOwner() != null && c.getVenue().getOwner().getId().equals(currentUser.getId()) && "ACTIVE".equalsIgnoreCase(c.getStatus()))
                .count();

        long totalVenues = venueRepository.findByOwnerId(currentUser.getId()).size();

        Map<String, Integer> bookingsBySport = bookings.stream()
                .collect(Collectors.groupingBy(
                        b -> (b.getCourt() != null && b.getCourt().getSportType() != null) ? b.getCourt().getSportType() : "OTHER",
                        Collectors.summingInt(b -> 1)
                ));

        Map<String, Integer> bookingsByStatus = bookings.stream()
                .collect(Collectors.groupingBy(
                        b -> b.getStatus().name(),
                        Collectors.summingInt(b -> 1)
                ));

        Map<String, Object> data = new LinkedHashMap<>();
        data.put("totalBookings", (int) totalBookings);
        data.put("totalRevenue", revenue.doubleValue());
        data.put("activeCourts", (int) activeCourts);
        data.put("activeFacilities", (int) totalVenues);
        data.put("bookingsBySport", bookingsBySport);
        data.put("bookingsByStatus", bookingsByStatus);

        return ResponseEntity.ok(data);
    }
}
