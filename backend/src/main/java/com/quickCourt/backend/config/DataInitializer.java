package com.quickCourt.backend.config;

import com.quickCourt.backend.entity.Court;
import com.quickCourt.backend.entity.Role;
import com.quickCourt.backend.entity.User;
import com.quickCourt.backend.entity.Venue;
import com.quickCourt.backend.repository.CourtRepository;
import com.quickCourt.backend.repository.UserRepository;
import com.quickCourt.backend.repository.VenueRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.time.LocalTime;
import java.util.List;

@Component
public class DataInitializer implements CommandLineRunner {

    private static final Logger log = LoggerFactory.getLogger(DataInitializer.class);

    private final UserRepository userRepository;
    private final VenueRepository venueRepository;
    private final CourtRepository courtRepository;
    private final PasswordEncoder passwordEncoder;

    @Value("${admin.email:${ADMIN_EMAIL:}}")
    private String adminEmail;

    @Value("${admin.password:${ADMIN_PASSWORD:}}")
    private String adminPassword;

    public DataInitializer(UserRepository userRepository,
                           VenueRepository venueRepository,
                           CourtRepository courtRepository,
                           PasswordEncoder passwordEncoder) {
        this.userRepository = userRepository;
        this.venueRepository = venueRepository;
        this.courtRepository = courtRepository;
        this.passwordEncoder = passwordEncoder;
    }

    @Override
    public void run(String... args) {
        initializeAdminUser();
        initializeDemoVenuesAndCourts();
    }

    private void initializeAdminUser() {
        if (adminEmail != null && !adminEmail.isBlank() && adminPassword != null && !adminPassword.isBlank()) {
            String email = adminEmail.toLowerCase().trim();
            if (!userRepository.existsByEmailIgnoreCase(email)) {
                User admin = new User();
                admin.setFullName("Platform Administrator");
                admin.setEmail(email);
                admin.setPassword(passwordEncoder.encode(adminPassword));
                admin.setRole(Role.ADMIN);
                admin.setVerified(true);
                admin.setStatus("ACTIVE");
                userRepository.save(admin);
                log.info("Initialized administrator account for configured email: {}", email);
            }
        }
    }

    private void initializeDemoVenuesAndCourts() {
        if (venueRepository.count() > 0) {
            return;
        }

        // Create or get demo owner
        String ownerEmail = "demo.owner@quickcourt.com";
        User owner = userRepository.findByEmailIgnoreCase(ownerEmail).orElseGet(() -> {
            User u = new User();
            u.setFullName("Bangalore Sports Association");
            u.setEmail(ownerEmail);
            u.setPassword(passwordEncoder.encode("Owner@123"));
            u.setRole(Role.FACILITY_OWNER);
            u.setVerified(true);
            u.setStatus("ACTIVE");
            u.setPhone("+91 9876543210");
            return userRepository.save(u);
        });

        // Venue 1: SmashZone Badminton Arena (Koramangala, Bengaluru)
        Venue v1 = createVenue(
                "SmashZone Badminton Arena",
                "Premier indoor badminton facility in Koramangala with tournament-grade teakwood and synthetic courts, high ceiling, and full pro lighting.",
                "Koramangala, Bengaluru",
                "17th Main Rd, 5th Block, Koramangala, Bengaluru, Karnataka 560034",
                "Bengaluru",
                "560034",
                "BADMINTON",
                350.0,
                4.8,
                124,
                "Parking, Changing Room, Drinking Water, Equipment Rental, Shower",
                "https://images.unsplash.com/photo-1626224583764-f87db24ac4ea?auto=format&fit=crop&w=1200&q=80",
                owner
        );
        createCourt(v1, "SmashZone Court 1 (Teakwood)", "BADMINTON", new BigDecimal("350.00"));
        createCourt(v1, "SmashZone Court 2 (Synthetic)", "BADMINTON", new BigDecimal("350.00"));
        createCourt(v1, "SmashZone Court 3 (Synthetic)", "BADMINTON", new BigDecimal("350.00"));

        // Venue 2: ProClub Arena Electronic City (Electronic City, Bengaluru)
        Venue v2 = createVenue(
                "ProClub Arena Electronic City",
                "High-tech sports hub in Electronic City offering FIFA-standard turf football, hardwood basketball, and BWF synthetic badminton courts.",
                "Electronic City, Bengaluru",
                "Phase 1, Near Infosys Gate 4, Electronic City, Bengaluru, Karnataka 560100",
                "Bengaluru",
                "560100",
                "BADMINTON,FOOTBALL,BASKETBALL",
                500.0,
                4.7,
                89,
                "Floodlights, 5-a-side Turf, Parking, Cafeteria, Lockers, First Aid",
                "https://images.unsplash.com/photo-1574629810360-7efbbe195018?auto=format&fit=crop&w=1200&q=80",
                owner
        );
        createCourt(v2, "FIFA AstroTurf Field", "FOOTBALL", new BigDecimal("900.00"));
        createCourt(v2, "Pro Basketball Court", "BASKETBALL", new BigDecimal("600.00"));
        createCourt(v2, "Indoor Badminton Court A", "BADMINTON", new BigDecimal("500.00"));

        // Venue 3: Ace Tennis & Multi-Sport Complex (Indiranagar, Bengaluru)
        Venue v3 = createVenue(
                "Ace Tennis & Multi-Sport Complex",
                "Elite tennis academy and multi-sport center located in central Indiranagar featuring clay and hard courts with professional floodlights.",
                "Indiranagar, Bengaluru",
                "100 Feet Road, HAL 2nd Stage, Indiranagar, Bengaluru, Karnataka 560038",
                "Bengaluru",
                "560038",
                "TENNIS,BASKETBALL",
                450.0,
                4.9,
                165,
                "Clay Courts, Floodlights, Equipment Rental, Shower, Pro Shop, Parking",
                "https://images.unsplash.com/photo-1595435934249-5df7ed86e1c0?auto=format&fit=crop&w=1200&q=80",
                owner
        );
        createCourt(v3, "Center Court (Clay)", "TENNIS", new BigDecimal("550.00"));
        createCourt(v3, "Court 2 (Synthetic Hard)", "TENNIS", new BigDecimal("450.00"));
        createCourt(v3, "Indiranagar Hoops Arena", "BASKETBALL", new BigDecimal("500.00"));

        // Venue 4: Whitefield Sports Hub (Whitefield, Bengaluru)
        Venue v4 = createVenue(
                "Whitefield Sports Hub",
                "Expansive 2-acre sports destination in Whitefield catering to techies and sports enthusiasts across Football, Tennis, Badminton, and Basketball.",
                "Whitefield, Bengaluru",
                "ITPL Main Road, Prestige Shantiniketan, Whitefield, Bengaluru, Karnataka 560066",
                "Bengaluru",
                "560066",
                "FOOTBALL,TENNIS,BADMINTON,BASKETBALL",
                600.0,
                4.6,
                98,
                "Parking, Floodlights, Cafeteria, Changing Room, First Aid, Drinking Water",
                "https://images.unsplash.com/photo-1529900748604-07564a03e7a6?auto=format&fit=crop&w=1200&q=80",
                owner
        );
        createCourt(v4, "Main Turf 7v7", "FOOTBALL", new BigDecimal("1200.00"));
        createCourt(v4, "Tennis Court 1", "TENNIS", new BigDecimal("600.00"));
        createCourt(v4, "Badminton Court 1", "BADMINTON", new BigDecimal("400.00"));
        createCourt(v4, "Full Court Basketball", "BASKETBALL", new BigDecimal("700.00"));

        // Venue 5: KickOff Turf & Sports Park (HSR Layout, Bengaluru)
        Venue v5 = createVenue(
                "KickOff Turf & Sports Park",
                "Dynamic artificial turf arena in HSR Layout Sector 1 designed for fast-paced 5-a-side and 7-a-side football matches and leagues.",
                "HSR Layout, Bengaluru",
                "27th Main Road, Sector 1, HSR Layout, Bengaluru, Karnataka 560102",
                "Bengaluru",
                "560102",
                "FOOTBALL",
                750.0,
                4.5,
                76,
                "5-a-side Artificial Turf, Floodlights, Bibs & Balls Provided, Dugouts, Parking",
                "https://images.unsplash.com/photo-1551958219-acbc608c6377?auto=format&fit=crop&w=1200&q=80",
                owner
        );
        createCourt(v5, "Turf Pitch Alpha", "FOOTBALL", new BigDecimal("850.00"));
        createCourt(v5, "Turf Pitch Beta", "FOOTBALL", new BigDecimal("750.00"));

        // Venue 6: Apex Racquet & Court Club (Jayanagar, Bengaluru)
        Venue v6 = createVenue(
                "Apex Racquet & Court Club",
                "Traditional sports club in South Bangalore offering top-tier red clay tennis courts and wooden badminton courts with heritage charm.",
                "Jayanagar, Bengaluru",
                "4th Block, Near Cool Joint, Jayanagar, Bengaluru, Karnataka 560041",
                "Bengaluru",
                "560041",
                "TENNIS,BADMINTON",
                400.0,
                4.8,
                110,
                "Air Conditioned Lounge, Pro Shop, Showers, Parking, Drinking Water",
                "https://images.unsplash.com/photo-1554068865-24cecd4e34b8?auto=format&fit=crop&w=1200&q=80",
                owner
        );
        createCourt(v6, "Jayanagar Clay Tennis", "TENNIS", new BigDecimal("500.00"));
        createCourt(v6, "Teakwood Court 1", "BADMINTON", new BigDecimal("400.00"));
        createCourt(v6, "Teakwood Court 2", "BADMINTON", new BigDecimal("400.00"));

        log.info("Initialized 6 realistic Bengaluru sports venues covering Badminton, Tennis, Football, and Basketball.");
    }

    private Venue createVenue(String name, String description, String location, String address,
                              String city, String pincode, String sportType, double price,
                              double rating, int reviewCount, String amenities, String photoUrl, User owner) {
        Venue v = new Venue();
        v.setName(name);
        v.setDescription(description);
        v.setLocation(location);
        v.setAddress(address);
        v.setCity(city);
        v.setPincode(pincode);
        v.setSportType(sportType);
        v.setPrice(price);
        v.setRating(rating);
        v.setReviewCount(reviewCount);
        v.setAmenities(amenities);
        v.setPhotos(photoUrl);
        v.setApproved(true);
        v.setStatus("APPROVED");
        v.setOpeningTime(LocalTime.of(6, 0));
        v.setClosingTime(LocalTime.of(23, 0));
        v.setOwner(owner);
        return venueRepository.save(v);
    }

    private void createCourt(Venue venue, String name, String sportType, BigDecimal pricePerHour) {
        Court c = new Court();
        c.setVenue(venue);
        c.setName(name);
        c.setSportType(sportType);
        c.setPricePerHour(pricePerHour);
        c.setStatus("ACTIVE");
        courtRepository.save(c);
    }
}
