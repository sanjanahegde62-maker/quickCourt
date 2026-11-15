package com.quickCourt.backend.dto;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class CourtResponse {

    private Long id;
    private String name;
    private String sportType;
    private java.math.BigDecimal pricePerHour;
    private Long venueId;
    private Long facilityId;
    private String status = "ACTIVE";
    private boolean active = true;

    public void setVenueId(Long venueId) {
        this.venueId = venueId;
        this.facilityId = venueId;
    }
}
