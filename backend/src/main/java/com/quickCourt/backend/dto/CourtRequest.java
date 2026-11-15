package com.quickCourt.backend.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class CourtRequest {

    @NotBlank
    private String name;

    @NotBlank
    private String sportType;

    @DecimalMin(value = "0.01")
    private java.math.BigDecimal pricePerHour;

    private Long venueId;

    private Long facilityId;

    private String status; // ACTIVE, INACTIVE

    public Long resolveVenueId(Long pathVenueId) {
        if (pathVenueId != null) {
            return pathVenueId;
        }
        if (venueId != null) {
            return venueId;
        }
        return facilityId;
    }
}
