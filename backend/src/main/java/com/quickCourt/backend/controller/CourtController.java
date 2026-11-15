package com.quickCourt.backend.controller;

import com.quickCourt.backend.dto.CourtRequest;
import com.quickCourt.backend.dto.CourtResponse;
import com.quickCourt.backend.dto.SlotResponse;
import com.quickCourt.backend.entity.User;
import com.quickCourt.backend.service.CourtService;
import jakarta.validation.Valid;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping({"/api/courts", "/courts"})
public class CourtController {

    private final CourtService courtService;

    public CourtController(CourtService courtService) {
        this.courtService = courtService;
    }

    @PostMapping
    public ResponseEntity<CourtResponse> createCourt(
            @Valid @RequestBody CourtRequest request,
            @AuthenticationPrincipal User currentUser) {

        return new ResponseEntity<>(
                courtService.createCourt(request, currentUser, null),
                HttpStatus.CREATED
        );
    }

    @GetMapping("/{id}")
    public ResponseEntity<CourtResponse> getCourt(@PathVariable Long id) {
        return ResponseEntity.ok(courtService.getCourtById(id));
    }

    @GetMapping("/{id}/availability")
    public ResponseEntity<List<SlotResponse>> getAvailability(
            @PathVariable Long id,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {

        return ResponseEntity.ok(courtService.getAvailability(id, date));
    }

    @GetMapping("/venue/{venueId}")
    public ResponseEntity<List<CourtResponse>> getCourtsByVenue(@PathVariable Long venueId) {
        return ResponseEntity.ok(courtService.getCourtsByVenue(venueId));
    }

    @PutMapping("/{id}")
    public ResponseEntity<CourtResponse> updateCourt(
            @PathVariable Long id,
            @RequestBody CourtRequest request,
            @AuthenticationPrincipal User currentUser) {

        return ResponseEntity.ok(courtService.updateCourt(id, request, currentUser));
    }

    @PatchMapping("/{id}")
    public ResponseEntity<CourtResponse> patchCourt(
            @PathVariable Long id,
            @RequestBody CourtRequest request,
            @AuthenticationPrincipal User currentUser) {

        return ResponseEntity.ok(courtService.updateCourt(id, request, currentUser));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteCourt(
            @PathVariable Long id,
            @AuthenticationPrincipal User currentUser) {

        courtService.deleteCourt(id, currentUser);
        return ResponseEntity.noContent().build();
    }
}
