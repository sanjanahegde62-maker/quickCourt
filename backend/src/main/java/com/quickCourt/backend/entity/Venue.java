package com.quickCourt.backend.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalTime;

@Entity
@Table(name = "venues")
@Getter
@Setter
public class Venue {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String name;

    @Column(length = 2000)
    private String description;

    @Column(nullable = false)
    private String location;

    @Column(length = 500)
    private String address;

    @Column(length = 100)
    private String city;

    @Column(length = 20)
    private String pincode;

    @Column(nullable = false)
    private String sportType;

    @Column(nullable = false)
    private double price;

    private Double rating;

    private Integer reviewCount;

    @Column(length = 1000)
    private String amenities;

    @Column(nullable = false)
    private boolean approved = false;

    @Column(nullable = false)
    private String status = "PENDING"; // PENDING, APPROVED, REJECTED

    private String rejectionReason;

    private LocalTime openingTime = LocalTime.of(6, 0);

    private LocalTime closingTime = LocalTime.of(22, 0);

    @Column(length = 4000)
    private String photos;

    @ManyToOne(optional = false, fetch = FetchType.LAZY)
    @JoinColumn(name = "owner_id", nullable = false)
    private User owner;
}
