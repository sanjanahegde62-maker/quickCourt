package com.quickCourt.backend.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Getter;
import lombok.Setter;

import java.util.Collections;
import java.util.List;

@Getter
@Setter
public class VenueRequest {

    @NotBlank
    private String name;

    private String description;

    @NotBlank
    private String location;

    private String address;

    private String city;

    private String pincode;

    private String sportType;

    private List<String> sportTypes;

    private double price;

    private Double rating;

    private Integer reviewCount;

    private Object amenities;

    private Long ownerId;

    private String openingTime;

    private String closingTime;

    private Object photos;

    public String resolveSportType() {
        if (sportTypes != null && !sportTypes.isEmpty()) {
            return String.join(",", sportTypes);
        }
        if (sportType != null && !sportType.isBlank()) {
            return sportType.trim();
        }
        return "GENERAL";
    }

    public List<String> resolvePhotosList() {
        if (photos instanceof List<?> list) {
            return list.stream().map(Object::toString).filter(s -> !s.isBlank()).toList();
        }
        if (photos instanceof String str && !str.isBlank()) {
            return List.of(str.split("[\\r\\n,]+"));
        }
        return Collections.emptyList();
    }

    public String resolveAmenities() {
        if (amenities instanceof List<?> list) {
            return String.join(", ", list.stream().map(Object::toString).filter(s -> !s.isBlank()).toList());
        }
        if (amenities instanceof String str) {
            return str.trim();
        }
        return null;
    }
}
