package com.quickCourt.backend.service;

import com.quickCourt.backend.dto.CourtRequest;
import com.quickCourt.backend.dto.CourtResponse;
import com.quickCourt.backend.dto.SlotResponse;
import com.quickCourt.backend.entity.Booking;
import com.quickCourt.backend.entity.BookingStatus;
import com.quickCourt.backend.entity.Court;
import com.quickCourt.backend.entity.Role;
import com.quickCourt.backend.entity.User;
import com.quickCourt.backend.entity.Venue;
import com.quickCourt.backend.exception.ResourceNotFoundException;
import com.quickCourt.backend.repository.BookingRepository;
import com.quickCourt.backend.repository.CourtRepository;
import com.quickCourt.backend.repository.VenueRepository;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

@Service
@Transactional
public class CourtService {

    private final CourtRepository courtRepository;
    private final VenueRepository venueRepository;
    private final BookingRepository bookingRepository;

    public CourtService(CourtRepository courtRepository,
                        VenueRepository venueRepository,
                        BookingRepository bookingRepository) {
        this.courtRepository = courtRepository;
        this.venueRepository = venueRepository;
        this.bookingRepository = bookingRepository;
    }

    public CourtResponse createCourt(CourtRequest request, User currentUser, Long pathVenueId) {
        Long venueId = request.resolveVenueId(pathVenueId);
        if (venueId == null) {
            throw new IllegalArgumentException("Venue ID is required to create a court");
        }

        Venue venue = venueRepository.findById(venueId)
                .orElseThrow(() -> new ResourceNotFoundException("Venue", venueId));

        verifyVenueOwnership(venue, currentUser);

        Court court = new Court();
        court.setName(request.getName().trim());
        court.setSportType(request.getSportType().trim().toUpperCase());
        court.setPricePerHour(request.getPricePerHour());
        court.setStatus(request.getStatus() != null ? request.getStatus().toUpperCase() : "ACTIVE");
        court.setVenue(venue);

        Court savedCourt = courtRepository.save(court);
        return mapToResponse(savedCourt);
    }

    public CourtResponse getCourtById(Long id) {
        Court court = courtRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Court", id));
        return mapToResponse(court);
    }

    public List<CourtResponse> getCourtsByVenue(Long venueId) {
        Venue venue = venueRepository.findById(venueId)
                .orElseThrow(() -> new ResourceNotFoundException("Venue", venueId));

        return courtRepository.findByVenueId(venue.getId())
                .stream()
                .map(this::mapToResponse)
                .toList();
    }

    public CourtResponse updateCourt(Long id, CourtRequest request, User currentUser) {
        Court court = courtRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Court", id));

        verifyVenueOwnership(court.getVenue(), currentUser);

        if (request.getName() != null && !request.getName().isBlank()) {
            court.setName(request.getName().trim());
        }
        if (request.getSportType() != null && !request.getSportType().isBlank()) {
            court.setSportType(request.getSportType().trim().toUpperCase());
        }
        if (request.getPricePerHour() != null) {
            court.setPricePerHour(request.getPricePerHour());
        }
        if (request.getStatus() != null && !request.getStatus().isBlank()) {
            court.setStatus(request.getStatus().trim().toUpperCase());
        }

        return mapToResponse(courtRepository.save(court));
    }

    public void deleteCourt(Long id, User currentUser) {
        Court court = courtRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Court", id));

        verifyVenueOwnership(court.getVenue(), currentUser);

        List<Booking> bookings = bookingRepository.findByCourtId(id);
        boolean hasActiveBookings = bookings.stream()
                .anyMatch(b -> b.getStatus() == com.quickCourt.backend.entity.BookingStatus.CONFIRMED && !b.getBookingDate().isBefore(LocalDate.now()));

        if (hasActiveBookings) {
            // Cannot delete court with future active bookings; soft-deactivate instead
            court.setStatus("INACTIVE");
            courtRepository.save(court);
            throw new IllegalArgumentException("Court has active upcoming bookings. It has been deactivated instead of deleted.");
        }

        courtRepository.delete(court);
    }

    public List<SlotResponse> getAvailability(Long courtId, LocalDate date) {
        Court court = courtRepository.findById(courtId)
                .orElseThrow(() -> new ResourceNotFoundException("Court", courtId));

        LocalDate targetDate = date != null ? date : LocalDate.now();
        Venue venue = court.getVenue();

        LocalTime open = venue.getOpeningTime() != null ? venue.getOpeningTime() : LocalTime.of(6, 0);
        LocalTime close = venue.getClosingTime() != null ? venue.getClosingTime() : LocalTime.of(23, 0);

        List<SlotResponse> slots = new ArrayList<>();
        if (!open.isBefore(close)) {
            return slots;
        }

        LocalDateTime now = LocalDateTime.now();
        List<Booking> activeBookings = bookingRepository.findActiveByCourtAndDate(courtId, targetDate, now);

        LocalTime current = open;
        while (current.isBefore(close) && slots.size() < 48) {
            LocalTime next = current.plusHours(1);
            if (next.isBefore(current) || next.isAfter(close)) {
                break;
            }
            final LocalTime slotStart = current;
            final LocalTime slotEnd = next;

            // Check if there is an overlapping booking
            Optional<Booking> matchingBooking = activeBookings.stream().filter(b ->
                    b.getStartTime().isBefore(slotEnd) && b.getEndTime().isAfter(slotStart)).findFirst();

            boolean inPast = targetDate.isBefore(LocalDate.now()) ||
                    (targetDate.equals(LocalDate.now()) && slotStart.isBefore(LocalTime.now()));

            boolean booked = false;
            boolean held = false;
            LocalDateTime holdExpiry = null;

            if (matchingBooking.isPresent()) {
                Booking b = matchingBooking.get();
                if (b.getStatus() == BookingStatus.CONFIRMED || b.getStatus() == BookingStatus.BLOCKED) {
                    booked = true;
                } else if (b.getStatus() == BookingStatus.PENDING && b.getHoldExpiresAt() != null && b.getHoldExpiresAt().isAfter(now)) {
                    held = true;
                    holdExpiry = b.getHoldExpiresAt();
                }
            }

            boolean available = !booked && !held && !inPast && "ACTIVE".equalsIgnoreCase(court.getStatus());

            String slotId = "c" + courtId + "_" + targetDate + "_" + slotStart + "_" + slotEnd;
            String status = booked ? "BOOKED" : held ? "HELD" : inPast ? "PAST" : available ? "AVAILABLE" : "UNAVAILABLE";

            SlotResponse slot = new SlotResponse();
            slot.setSlotId(slotId);
            slot.setCourtId(courtId);
            slot.setDate(targetDate);
            slot.setStartTime(slotStart);
            slot.setEndTime(slotEnd);
            slot.setDuration(60);
            slot.setPrice(court.getPricePerHour());
            slot.setStatus(status);
            slot.setAvailable(available);
            slot.setHoldExpiresAt(holdExpiry);

            slots.add(slot);
            current = next;
        }

        return slots;
    }

    private void verifyVenueOwnership(Venue venue, User user) {
        if (user == null) {
            throw new AccessDeniedException("Authentication required");
        }
        if (user.getRole() == Role.ADMIN) {
            return;
        }
        if (!venue.getOwner().getId().equals(user.getId())) {
            throw new AccessDeniedException("You do not have permission to modify courts for this venue");
        }
    }

    public CourtResponse mapToResponse(Court court) {
        CourtResponse response = new CourtResponse();
        response.setId(court.getId());
        response.setName(court.getName());
        response.setSportType(court.getSportType());
        response.setPricePerHour(court.getPricePerHour());
        response.setVenueId(court.getVenue().getId());
        response.setStatus(court.getStatus());
        response.setActive("ACTIVE".equalsIgnoreCase(court.getStatus()));
        return response;
    }
}
