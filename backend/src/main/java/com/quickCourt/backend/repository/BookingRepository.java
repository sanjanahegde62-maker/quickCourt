package com.quickCourt.backend.repository;

import com.quickCourt.backend.entity.Booking;
import com.quickCourt.backend.entity.BookingStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.List;
import java.util.Optional;

public interface BookingRepository extends JpaRepository<Booking, Long> {

    @Query("""
        SELECT COUNT(b) > 0
        FROM Booking b
        WHERE b.court.id = :courtId
        AND b.bookingDate = :bookingDate
        AND (
            b.status IN (com.quickCourt.backend.entity.BookingStatus.CONFIRMED, com.quickCourt.backend.entity.BookingStatus.BLOCKED)
            OR (b.status = com.quickCourt.backend.entity.BookingStatus.PENDING AND b.holdExpiresAt IS NOT NULL AND b.holdExpiresAt > :now)
        )
        AND b.startTime < :endTime
        AND b.endTime > :startTime
    """)
    boolean existsOverlappingBooking(
            @Param("courtId") Long courtId,
            @Param("bookingDate") LocalDate bookingDate,
            @Param("startTime") LocalTime startTime,
            @Param("endTime") LocalTime endTime,
            @Param("now") LocalDateTime now
    );

    default boolean existsOverlappingBooking(Long courtId, LocalDate bookingDate, LocalTime startTime, LocalTime endTime) {
        return existsOverlappingBooking(courtId, bookingDate, startTime, endTime, LocalDateTime.now());
    }

    @Query("""
        SELECT b FROM Booking b
        WHERE b.court.id = :courtId
        AND b.bookingDate = :bookingDate
        AND (
            b.status IN (com.quickCourt.backend.entity.BookingStatus.CONFIRMED, com.quickCourt.backend.entity.BookingStatus.BLOCKED)
            OR (b.status = com.quickCourt.backend.entity.BookingStatus.PENDING AND b.holdExpiresAt IS NOT NULL AND b.holdExpiresAt > :now)
        )
    """)
    List<Booking> findActiveByCourtAndDate(
            @Param("courtId") Long courtId,
            @Param("bookingDate") LocalDate bookingDate,
            @Param("now") LocalDateTime now
    );

    default List<Booking> findActiveByCourtAndDate(Long courtId, LocalDate bookingDate) {
        return findActiveByCourtAndDate(courtId, bookingDate, LocalDateTime.now());
    }

    @Query("""
        SELECT b FROM Booking b
        WHERE b.status = com.quickCourt.backend.entity.BookingStatus.PENDING
        AND b.holdExpiresAt <= :now
    """)
    List<Booking> findExpiredHolds(@Param("now") LocalDateTime now);

    Optional<Booking> findByRazorpayOrderId(String razorpayOrderId);

    Optional<Booking> findByRazorpayPaymentId(String razorpayPaymentId);

    List<Booking> findByUserIdOrderByBookingDateDescStartTimeDesc(Long userId);

    List<Booking> findByUserId(Long userId);

    List<Booking> findByCourtId(Long courtId);

    List<Booking> findByCourtVenueOwnerIdOrderByBookingDateDescStartTimeDesc(Long ownerId);

    long countByCourtVenueOwnerId(Long ownerId);

    @Query("SELECT COALESCE(SUM(b.totalPrice), 0) FROM Booking b WHERE b.court.venue.owner.id = :ownerId AND b.status = com.quickCourt.backend.entity.BookingStatus.CONFIRMED")
    BigDecimal sumRevenueByOwnerId(@Param("ownerId") Long ownerId);

    @Query("SELECT COALESCE(SUM(b.totalPrice), 0) FROM Booking b WHERE b.status = com.quickCourt.backend.entity.BookingStatus.CONFIRMED")
    BigDecimal sumTotalRevenue();
}
