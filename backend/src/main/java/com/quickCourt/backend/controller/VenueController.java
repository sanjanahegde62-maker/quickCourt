package com.quickCourt.backend.controller;

import com.quickCourt.backend.dto.CourtResponse;
import com.quickCourt.backend.dto.VenueRequest;
import com.quickCourt.backend.dto.VenueResponse;
import com.quickCourt.backend.entity.User;
import com.quickCourt.backend.service.CourtService;
import com.quickCourt.backend.service.VenueService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.Collections;
import java.util.List;

@RestController
@RequestMapping({"/api/venues", "/api/facilities", "/venues", "/facilities"})
public class VenueController {

    private final VenueService venueService;
    private final CourtService courtService;

    public VenueController(VenueService venueService, CourtService courtService) {
        this.venueService = venueService;
        this.courtService = courtService;
    }

    @PostMapping
    public ResponseEntity<VenueResponse> create(
            @Valid @RequestBody VenueRequest request,
            @AuthenticationPrincipal User currentUser) {

        return ResponseEntity.status(HttpStatus.CREATED)
                .body(venueService.create(request, currentUser));
    }

    @GetMapping
    public ResponseEntity<List<VenueResponse>> getApprovedVenues(
            @RequestParam(required = false, name = "q") String q,
            @RequestParam(required = false, name = "keyword") String keyword,
            @RequestParam(required = false, name = "location") String location,
            @RequestParam(required = false, name = "city") String city,
            @RequestParam(required = false, name = "sport") String sport,
            @RequestParam(required = false, name = "minPrice") Double minPrice,
            @RequestParam(required = false, name = "maxPrice") Double maxPrice,
            @RequestParam(required = false, name = "minRating") Double minRating,
            @RequestParam(required = false, name = "amenity") String amenity,
            @RequestParam(required = false, name = "sort") String sort) {

        String searchTerm = q != null && !q.isBlank() ? q
                : location != null && !location.isBlank() ? location
                : city != null && !city.isBlank() ? city
                : keyword;

        List<VenueResponse> list = (searchTerm != null && !searchTerm.isBlank())
                ? venueService.search(searchTerm)
                : venueService.getApprovedVenues();

        if (sport != null && !sport.isBlank() && !"ALL".equalsIgnoreCase(sport.trim())) {
            String sportFilter = sport.toUpperCase().trim();
            list = list.stream().filter(v -> v.getSportType() != null &&
                    v.getSportType().toUpperCase().contains(sportFilter)).toList();
        }
        if (minPrice != null) {
            list = list.stream().filter(v -> v.getPrice() >= minPrice).toList();
        }
        if (maxPrice != null) {
            list = list.stream().filter(v -> v.getPrice() <= maxPrice).toList();
        }
        if (minRating != null) {
            list = list.stream().filter(v -> v.getRating() != null && v.getRating() >= minRating).toList();
        }
        if (amenity != null && !amenity.isBlank()) {
            String targetAmenity = amenity.toLowerCase().trim();
            list = list.stream().filter(v -> v.getAmenities() != null &&
                    v.getAmenities().stream().anyMatch(a -> a.toLowerCase().contains(targetAmenity))).toList();
        }
        if (sort != null && !sort.isBlank()) {
            String s = sort.toLowerCase().trim();
            if (s.contains("price") && (s.contains("asc") || s.contains("low"))) {
                list = list.stream().sorted((a, b) -> Double.compare(a.getPrice(), b.getPrice())).toList();
            } else if (s.contains("price") && (s.contains("desc") || s.contains("high"))) {
                list = list.stream().sorted((a, b) -> Double.compare(b.getPrice(), a.getPrice())).toList();
            } else if (s.contains("rating")) {
                list = list.stream().sorted((a, b) -> {
                    double rA = a.getRating() != null ? a.getRating() : 0.0;
                    double rB = b.getRating() != null ? b.getRating() : 0.0;
                    return Double.compare(rB, rA);
                }).toList();
            } else if (s.contains("name")) {
                list = list.stream().sorted((a, b) -> a.getName().compareToIgnoreCase(b.getName())).toList();
            }
        }

        return ResponseEntity.ok(list);
    }

    @GetMapping("/search")
    public ResponseEntity<List<VenueResponse>> search(@RequestParam(required = false) String keyword) {
        return ResponseEntity.ok(venueService.search(keyword));
    }

    @GetMapping("/{id}")
    public ResponseEntity<VenueResponse> getById(@PathVariable Long id) {
        return ResponseEntity.ok(venueService.getById(id));
    }

    @GetMapping("/{id}/courts")
    public ResponseEntity<List<CourtResponse>> getCourtsForVenue(@PathVariable Long id) {
        return ResponseEntity.ok(courtService.getCourtsByVenue(id));
    }

    @GetMapping("/{id}/reviews")
    public ResponseEntity<List<Object>> getReviewsForVenue(@PathVariable Long id) {
        return ResponseEntity.ok(Collections.emptyList());
    }

    @PutMapping("/{id}")
    public ResponseEntity<VenueResponse> update(
            @PathVariable Long id,
            @Valid @RequestBody VenueRequest request,
            @AuthenticationPrincipal User currentUser) {

        return ResponseEntity.ok(venueService.update(id, request, currentUser));
    }

    @PatchMapping("/{id}")
    public ResponseEntity<VenueResponse> patch(
            @PathVariable Long id,
            @RequestBody VenueRequest request,
            @AuthenticationPrincipal User currentUser) {

        return ResponseEntity.ok(venueService.update(id, request, currentUser));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(
            @PathVariable Long id,
            @AuthenticationPrincipal User currentUser) {

        venueService.delete(id, currentUser);
        return ResponseEntity.noContent().build();
    }
}
