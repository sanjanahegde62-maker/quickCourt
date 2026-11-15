package com.quickCourt.backend.repository;

import com.quickCourt.backend.entity.Venue;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface VenueRepository extends JpaRepository<Venue, Long> {

    List<Venue> findByApprovedTrue();

    List<Venue> findByStatus(String status);

    List<Venue> findByOwnerId(Long ownerId);

    long countByStatus(String status);

    long countByOwnerId(Long ownerId);

    boolean existsByName(String name);

    @Query("""
            SELECT v FROM Venue v
            WHERE v.approved = true
              AND (
                    LOWER(v.name) LIKE LOWER(CONCAT('%', :keyword, '%'))
                 OR LOWER(v.location) LIKE LOWER(CONCAT('%', :keyword, '%'))
                 OR (v.city IS NOT NULL AND LOWER(v.city) LIKE LOWER(CONCAT('%', :keyword, '%')))
                 OR (v.address IS NOT NULL AND LOWER(v.address) LIKE LOWER(CONCAT('%', :keyword, '%')))
                 OR (v.pincode IS NOT NULL AND LOWER(v.pincode) LIKE LOWER(CONCAT('%', :keyword, '%')))
                 OR LOWER(v.sportType) LIKE LOWER(CONCAT('%', :keyword, '%'))
                 OR (v.amenities IS NOT NULL AND LOWER(v.amenities) LIKE LOWER(CONCAT('%', :keyword, '%')))
              )
            """)
    List<Venue> searchApproved(@Param("keyword") String keyword);
}
