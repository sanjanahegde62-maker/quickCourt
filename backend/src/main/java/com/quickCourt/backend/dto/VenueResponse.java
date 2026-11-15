package com.quickCourt.backend.dto;

import lombok.Getter;
import lombok.Setter;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;

@Getter
@Setter
public class VenueResponse {

    private Long id;
    private String name;
    private String description;
    private String location;
    private String address;
    private String city;
    private String pincode;
    private String sportType;
    private List<String> sportTypes = new ArrayList<>();
    private double price;
    private double startingPrice;
    private Double rating;
    private Integer reviewCount;
    private List<String> amenities = new ArrayList<>();
    private boolean approved;
    private String status;
    private String rejectionReason;
    private String openingTime;
    private String closingTime;
    private List<String> photos = new ArrayList<>();
    private Long ownerId;
    private String ownerName;
    private String ownerEmail;

    public void setSportTypeAndTypes(String sportTypeStr) {
        this.sportType = sportTypeStr;
        if (sportTypeStr != null && !sportTypeStr.isBlank()) {
            this.sportTypes = Arrays.stream(sportTypeStr.split(","))
                    .map(String::trim)
                    .filter(s -> !s.isEmpty())
                    .toList();
        }
    }

    public void setAmenitiesFromStr(String amenitiesStr) {
        if (amenitiesStr != null && !amenitiesStr.isBlank()) {
            this.amenities = Arrays.stream(amenitiesStr.split(","))
                    .map(String::trim)
                    .filter(s -> !s.isEmpty())
                    .toList();
        } else {
            this.amenities = new ArrayList<>();
        }
    }
}
