package com.quickCourt.backend.controller;

import com.quickCourt.backend.dto.BookingResponse;
import com.quickCourt.backend.dto.UserResponse;
import com.quickCourt.backend.dto.VenueResponse;
import com.quickCourt.backend.entity.Booking;
import com.quickCourt.backend.entity.User;
import com.quickCourt.backend.entity.Venue;
import com.quickCourt.backend.repository.BookingRepository;
import com.quickCourt.backend.repository.CourtRepository;
import com.quickCourt.backend.repository.UserRepository;
import com.quickCourt.backend.repository.VenueRepository;
import com.quickCourt.backend.service.BookingService;
import com.quickCourt.backend.service.UserService;
import com.quickCourt.backend.service.VenueService;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.*;
import java.util.stream.Collectors;

@RestController
@RequestMapping({"/api/admin", "/admin"})
public class AdminController {

    private final VenueService venueService;
    private final BookingService bookingService;
    private final UserService userService;
    private final UserRepository userRepository;
    private final VenueRepository venueRepository;
    private final CourtRepository courtRepository;
    private final BookingRepository bookingRepository;

    public AdminController(VenueService venueService,
                           BookingService bookingService,
                           UserService userService,
                           UserRepository userRepository,
                           VenueRepository venueRepository,
                           CourtRepository courtRepository,
                           BookingRepository bookingRepository) {
        this.venueService = venueService;
        this.bookingService = bookingService;
        this.userService = userService;
        this.userRepository = userRepository;
        this.venueRepository = venueRepository;
        this.courtRepository = courtRepository;
        this.bookingRepository = bookingRepository;
    }

    @GetMapping("/facilities")
    public ResponseEntity<List<VenueResponse>> getAdminFacilities(
            @RequestParam(required = false) String status) {

        return ResponseEntity.ok(venueService.getVenuesByStatus(status));
    }

    @PostMapping("/facilities/{id}/approve")
    public ResponseEntity<VenueResponse> approveFacility(@PathVariable Long id) {
        return ResponseEntity.ok(venueService.approveVenue(id));
    }

    @PostMapping("/facilities/{id}/reject")
    public ResponseEntity<VenueResponse> rejectFacility(
            @PathVariable Long id,
            @RequestBody(required = false) Map<String, String> body) {

        String reason = body != null ? body.get("reason") : null;
        return ResponseEntity.ok(venueService.rejectVenue(id, reason));
    }

    @GetMapping("/users")
    public ResponseEntity<List<UserResponse>> getUsers(
            @RequestParam(required = false, name = "q") String q,
            @RequestParam(required = false, name = "search") String search,
            @RequestParam(required = false) String role,
            @RequestParam(required = false) String status) {

        String keyword = q != null ? q : search;
        List<User> users = userRepository.findAll();

        List<UserResponse> list = users.stream()
                .filter(u -> {
                    if (role != null && !role.isBlank()) {
                        String r = role.toUpperCase().replace("ROLE_", "");
                        if (!u.getRole().name().equalsIgnoreCase(r)) {
                            return false;
                        }
                    }
                    if (status != null && !status.isBlank()) {
                        if (!status.equalsIgnoreCase(u.getStatus())) {
                            return false;
                        }
                    }
                    if (keyword != null && !keyword.isBlank()) {
                        String match = (u.getFullName() + " " + u.getEmail()).toLowerCase();
                        return match.contains(keyword.toLowerCase().trim());
                    }
                    return true;
                })
                .map(userService::toResponse)
                .toList();

        return ResponseEntity.ok(list);
    }

    @PatchMapping("/users/{id}/status")
    public ResponseEntity<UserResponse> setUserStatus(
            @PathVariable Long id,
            @RequestBody Map<String, String> body) {

        User user = userRepository.findById(id)
                .orElseThrow(() -> new com.quickCourt.backend.exception.ResourceNotFoundException("User", id));

        String newStatus = body.get("status");
        if (newStatus != null && !newStatus.isBlank()) {
            user.setStatus(newStatus.toUpperCase().trim());
        }
        return ResponseEntity.ok(userService.toResponse(userRepository.save(user)));
    }

    @GetMapping("/bookings")
    public ResponseEntity<List<BookingResponse>> getAdminBookings(
            @RequestParam(required = false, name = "q") String q,
            @RequestParam(required = false, name = "search") String search,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {

        String keyword = q != null ? q : search;
        return ResponseEntity.ok(bookingService.getAdminBookings(keyword, status, date));
    }

    @GetMapping("/analytics")
    public ResponseEntity<Map<String, Object>> getAdminAnalytics() {
        long totalUsers = userRepository.count();
        long totalFacilities = venueRepository.count();
        long pendingFacilities = venueRepository.countByStatus("PENDING");
        long totalCourts = courtRepository.count();

        List<Booking> bookings = bookingRepository.findAll();
        long totalBookings = bookings.size();

        BigDecimal totalRevenue = bookings.stream()
                .filter(b -> b.getStatus() == com.quickCourt.backend.entity.BookingStatus.CONFIRMED)
                .map(Booking::getTotalPrice)
                .filter(Objects::nonNull)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        Map<String, Integer> bookingsBySport = bookings.stream()
                .collect(Collectors.groupingBy(
                        b -> b.getCourt().getSportType() != null ? b.getCourt().getSportType() : "OTHER",
                        Collectors.summingInt(b -> 1)
                ));

        Map<String, Integer> bookingsByStatus = bookings.stream()
                .collect(Collectors.groupingBy(
                        b -> b.getStatus().name(),
                        Collectors.summingInt(b -> 1)
                ));

        Map<String, Object> data = new LinkedHashMap<>();
        data.put("totalUsers", (int) totalUsers);
        data.put("totalFacilities", (int) totalFacilities);
        data.put("pendingFacilities", (int) pendingFacilities);
        data.put("totalCourts", (int) totalCourts);
        data.put("totalBookings", (int) totalBookings);
        data.put("totalRevenue", totalRevenue.doubleValue());
        data.put("bookingsBySport", bookingsBySport);
        data.put("bookingsByStatus", bookingsByStatus);

        return ResponseEntity.ok(data);
    }
}
