package com.quickCourt.backend.service;

import com.quickCourt.backend.dto.VenueRequest;
import com.quickCourt.backend.dto.VenueResponse;
import com.quickCourt.backend.entity.Role;
import com.quickCourt.backend.entity.User;
import com.quickCourt.backend.entity.Venue;
import com.quickCourt.backend.exception.InvalidOwnerException;
import com.quickCourt.backend.exception.ResourceNotFoundException;
import com.quickCourt.backend.repository.UserRepository;
import com.quickCourt.backend.repository.VenueRepository;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalTime;
import java.util.List;

@Service
@Transactional
public class VenueService {

    private final VenueRepository venueRepository;
    private final UserRepository userRepository;

    public VenueService(VenueRepository venueRepository, UserRepository userRepository) {
        this.venueRepository = venueRepository;
        this.userRepository = userRepository;
    }

    public VenueResponse create(VenueRequest request, User currentUser) {
        User owner = currentUser;
        if (owner == null && request.getOwnerId() != null) {
            owner = requireFacilityOwner(request.getOwnerId());
        }
        if (owner == null) {
            throw new InvalidOwnerException("Authentication required to create a venue");
        }
        if (owner.getRole() != Role.FACILITY_OWNER && owner.getRole() != Role.ADMIN) {
            throw new InvalidOwnerException("Owner must have FACILITY_OWNER or ADMIN role");
        }

        Venue venue = new Venue();
        venue.setName(request.getName().trim());
        venue.setDescription(request.getDescription());
        venue.setLocation(request.getLocation().trim());
        venue.setAddress(request.getAddress() != null && !request.getAddress().isBlank() ? request.getAddress().trim() : request.getLocation().trim());
        if (request.getCity() != null && !request.getCity().isBlank()) {
            venue.setCity(request.getCity().trim());
        }
        if (request.getPincode() != null && !request.getPincode().isBlank()) {
            venue.setPincode(request.getPincode().trim());
        }
        venue.setSportType(request.resolveSportType());
        venue.setPrice(request.getPrice());
        if (request.getRating() != null) {
            venue.setRating(request.getRating());
        }
        if (request.getReviewCount() != null) {
            venue.setReviewCount(request.getReviewCount());
        }
        String amenities = request.resolveAmenities();
        if (amenities != null) {
            venue.setAmenities(amenities);
        }

        venue.setApproved(false);
        venue.setStatus("PENDING");
        venue.setOwner(owner);

        if (request.getOpeningTime() != null && !request.getOpeningTime().isBlank()) {
            try {
                venue.setOpeningTime(LocalTime.parse(request.getOpeningTime().length() == 5 ? request.getOpeningTime() + ":00" : request.getOpeningTime()));
            } catch (Exception ignored) {}
        }
        if (request.getClosingTime() != null && !request.getClosingTime().isBlank()) {
            try {
                venue.setClosingTime(LocalTime.parse(request.getClosingTime().length() == 5 ? request.getClosingTime() + ":00" : request.getClosingTime()));
            } catch (Exception ignored) {}
        }

        List<String> photosList = request.resolvePhotosList();
        if (!photosList.isEmpty()) {
            venue.setPhotos(String.join("\n", photosList));
        }

        return toResponse(venueRepository.save(venue));
    }

    public List<VenueResponse> getApprovedVenues() {
        return venueRepository.findByApprovedTrue().stream()
                .map(this::toResponse)
                .toList();
    }

    public List<VenueResponse> getVenuesByOwner(Long ownerId) {
        return venueRepository.findByOwnerId(ownerId).stream()
                .map(this::toResponse)
                .toList();
    }

    public List<VenueResponse> getVenuesByStatus(String status) {
        if (status == null || status.isBlank()) {
            return venueRepository.findAll().stream().map(this::toResponse).toList();
        }
        return venueRepository.findByStatus(status.toUpperCase().trim()).stream()
                .map(this::toResponse)
                .toList();
    }

    public VenueResponse getById(Long id) {
        return toResponse(findVenue(id));
    }

    public VenueResponse update(Long id, VenueRequest request, User currentUser) {
        Venue venue = findVenue(id);
        verifyOwnershipOrAdmin(venue, currentUser);

        venue.setName(request.getName().trim());
        if (request.getDescription() != null) {
            venue.setDescription(request.getDescription());
        }
        venue.setLocation(request.getLocation().trim());
        if (request.getAddress() != null && !request.getAddress().isBlank()) {
            venue.setAddress(request.getAddress().trim());
        }
        if (request.getCity() != null && !request.getCity().isBlank()) {
            venue.setCity(request.getCity().trim());
        }
        if (request.getPincode() != null && !request.getPincode().isBlank()) {
            venue.setPincode(request.getPincode().trim());
        }
        venue.setSportType(request.resolveSportType());
        if (request.getPrice() > 0) {
            venue.setPrice(request.getPrice());
        }
        if (request.getRating() != null) {
            venue.setRating(request.getRating());
        }
        if (request.getReviewCount() != null) {
            venue.setReviewCount(request.getReviewCount());
        }
        String amenities = request.resolveAmenities();
        if (amenities != null) {
            venue.setAmenities(amenities);
        }

        if (request.getOpeningTime() != null && !request.getOpeningTime().isBlank()) {
            try {
                venue.setOpeningTime(LocalTime.parse(request.getOpeningTime().length() == 5 ? request.getOpeningTime() + ":00" : request.getOpeningTime()));
            } catch (Exception ignored) {}
        }
        if (request.getClosingTime() != null && !request.getClosingTime().isBlank()) {
            try {
                venue.setClosingTime(LocalTime.parse(request.getClosingTime().length() == 5 ? request.getClosingTime() + ":00" : request.getClosingTime()));
            } catch (Exception ignored) {}
        }

        List<String> photosList = request.resolvePhotosList();
        if (!photosList.isEmpty()) {
            venue.setPhotos(String.join("\n", photosList));
        }

        return toResponse(venueRepository.save(venue));
    }

    public VenueResponse approveVenue(Long id) {
        Venue venue = findVenue(id);
        venue.setApproved(true);
        venue.setStatus("APPROVED");
        venue.setRejectionReason(null);
        return toResponse(venueRepository.save(venue));
    }

    public VenueResponse rejectVenue(Long id, String reason) {
        Venue venue = findVenue(id);
        venue.setApproved(false);
        venue.setStatus("REJECTED");
        venue.setRejectionReason(reason != null && !reason.isBlank() ? reason.trim() : "Rejected by administrator");
        return toResponse(venueRepository.save(venue));
    }

    public void delete(Long id, User currentUser) {
        Venue venue = findVenue(id);
        verifyOwnershipOrAdmin(venue, currentUser);
        venueRepository.delete(venue);
    }

    public List<VenueResponse> search(String keyword) {
        if (keyword == null || keyword.isBlank()) {
            return getApprovedVenues();
        }
        String term = keyword.trim();
        List<Venue> results = venueRepository.searchApproved(term);
        if (results.isEmpty()) {
            String lower = term.toLowerCase();
            if (lower.contains("bangalore")) {
                results = venueRepository.searchApproved(lower.replace("bangalore", "bengaluru"));
            } else if (lower.contains("bengaluru")) {
                results = venueRepository.searchApproved(lower.replace("bengaluru", "bangalore"));
            } else if (lower.equals("blr")) {
                results = venueRepository.searchApproved("bengaluru");
            }
        }
        return results.stream()
                .map(this::toResponse)
                .toList();
    }

    public Venue findVenue(Long id) {
        return venueRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Venue", id));
    }

    private User requireFacilityOwner(Long ownerId) {
        User user = userRepository.findById(ownerId)
                .orElseThrow(() -> new InvalidOwnerException("Owner with ID " + ownerId + " not found"));
        if (user.getRole() != Role.FACILITY_OWNER && user.getRole() != Role.ADMIN) {
            throw new InvalidOwnerException("Owner must have FACILITY_OWNER or ADMIN role");
        }
        return user;
    }

    private void verifyOwnershipOrAdmin(Venue venue, User currentUser) {
        if (currentUser == null) {
            throw new AccessDeniedException("Authentication required");
        }
        if (currentUser.getRole() == Role.ADMIN) {
            return;
        }
        if (venue.getOwner() == null || !venue.getOwner().getId().equals(currentUser.getId())) {
            throw new AccessDeniedException("You do not own this facility");
        }
    }

    public VenueResponse toResponse(Venue venue) {
        VenueResponse response = new VenueResponse();
        response.setId(venue.getId());
        response.setName(venue.getName());
        response.setDescription(venue.getDescription());
        response.setLocation(venue.getLocation());
        response.setAddress(venue.getAddress() != null ? venue.getAddress() : venue.getLocation());
        response.setCity(venue.getCity());
        response.setPincode(venue.getPincode());
        response.setSportTypeAndTypes(venue.getSportType());
        response.setPrice(venue.getPrice());
        response.setStartingPrice(venue.getPrice());
        response.setRating(venue.getRating());
        response.setReviewCount(venue.getReviewCount());
        response.setAmenitiesFromStr(venue.getAmenities());
        response.setApproved(venue.isApproved());
        response.setStatus(venue.getStatus());
        response.setRejectionReason(venue.getRejectionReason());
        if (venue.getOpeningTime() != null) {
            response.setOpeningTime(venue.getOpeningTime().toString());
        }
        if (venue.getClosingTime() != null) {
            response.setClosingTime(venue.getClosingTime().toString());
        }
        if (venue.getPhotos() != null && !venue.getPhotos().isBlank()) {
            response.setPhotos(List.of(venue.getPhotos().split("[\\r\\n,]+")));
        }
        if (venue.getOwner() != null) {
            response.setOwnerId(venue.getOwner().getId());
            response.setOwnerName(venue.getOwner().getFullName());
            response.setOwnerEmail(venue.getOwner().getEmail());
        }
        return response;
    }
}
