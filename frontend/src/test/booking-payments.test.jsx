import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import SlotGrid from '../components/booking/SlotGrid'
import BookingCard from '../features/bookings/BookingCard'
import { toSlot, toBooking, bucketOf } from '../services/adapters'
import { BrowserRouter } from 'react-router-dom'

describe('SlotGrid and Availability Logic', () => {
  const sampleSlots = [
    {
      id: 'slot-1',
      startTime: '09:00:00',
      endTime: '10:00:00',
      price: 500,
      status: 'AVAILABLE',
      available: true,
      duration: 60,
    },
    {
      id: 'slot-2',
      startTime: '10:00:00',
      endTime: '11:00:00',
      price: 500,
      status: 'HELD',
      available: false,
      duration: 60,
    },
    {
      id: 'slot-3',
      startTime: '11:00:00',
      endTime: '12:00:00',
      price: 600,
      status: 'BOOKED',
      available: false,
      duration: 60,
    },
    {
      id: 'slot-4',
      startTime: '07:00:00',
      endTime: '08:00:00',
      price: 400,
      status: 'PAST',
      available: false,
      duration: 60,
    },
  ]

  it('renders all slots with correct visual badges and interactive states', () => {
    const handleSelect = vi.fn()
    render(<SlotGrid slots={sampleSlots} selectedId="slot-1" onSelect={handleSelect} />)

    // Available and selected slot
    expect(screen.getByText('✓ Selected')).toBeInTheDocument()

    // Held slot
    expect(screen.getByText('⏱ Held')).toBeInTheDocument()

    // Booked slot
    expect(screen.getByText('Booked')).toBeInTheDocument()

    // Past slot
    expect(screen.getByText('Past')).toBeInTheDocument()

    // Legend is present
    expect(screen.getByText('Legend:')).toBeInTheDocument()
    expect(screen.getByText('Temporarily Held (10 min)')).toBeInTheDocument()
  })

  it('allows clicking available slots and disallows clicking held or booked slots', async () => {
    const handleSelect = vi.fn()
    render(<SlotGrid slots={sampleSlots} selectedId="" onSelect={handleSelect} />)

    const buttons = screen.getAllByRole('button')
    // slot-1 (AVAILABLE)
    await userEvent.click(buttons[0])
    expect(handleSelect).toHaveBeenCalledWith(sampleSlots[0])

    // slot-2 (HELD) is disabled
    expect(buttons[1]).toBeDisabled()

    // slot-3 (BOOKED) is disabled
    expect(buttons[2]).toBeDisabled()
  })
})

describe('Adapters and Status Bucketing', () => {
  it('correctly adapts backend slot fields including duration and hold status', () => {
    const raw = {
      courtId: 5,
      startTime: '14:00:00',
      endTime: '15:00:00',
      price: 450,
      status: 'HELD',
      available: false,
      duration: 60,
      holdExpiresAt: '2026-11-05T15:10:00',
    }
    const slot = toSlot(raw)
    expect(slot.courtId).toBe(5)
    expect(slot.status).toBe('HELD')
    expect(slot.available).toBe(false)
    expect(slot.duration).toBe(60)
    expect(slot.holdExpiresAt).toBe('2026-11-05T15:10:00')
  })

  it('correctly adapts booking sportType, duration, and pricing fields', () => {
    const rawBooking = {
      id: 101,
      bookingId: 101,
      reference: 'QC-101',
      facilityName: 'SmashZone Badminton Arena',
      courtName: 'SmashZone Court 1 (Teakwood)',
      sportType: 'BADMINTON',
      sport: 'BADMINTON',
      bookingDate: '2026-11-09',
      startTime: '13:00:00',
      endTime: '14:00:00',
      durationMinutes: 60,
      totalPrice: 350.0,
      status: 'PENDING',
      paymentStatus: 'PENDING',
    }

    const booking = toBooking(rawBooking)
    expect(booking.id).toBe(101)
    expect(booking.sportType).toBe('BADMINTON')
    expect(booking.facilityName).toBe('SmashZone Badminton Arena')
    expect(booking.courtName).toBe('SmashZone Court 1 (Teakwood)')
    expect(booking.duration).toBe(60)
    expect(booking.totalAmount).toBe(350.0)
    expect(booking.status).toBe('PENDING')
  })

  it('renders Sport and court details on BookingCard', () => {
    const mockBooking = {
      id: 42,
      reference: 'QC-42',
      facilityName: 'SmashZone Arena',
      courtName: 'Court 1',
      sportType: 'BADMINTON',
      date: '2026-11-09',
      startTime: '13:00:00',
      endTime: '14:00:00',
      totalAmount: 350,
      status: 'PENDING',
      paymentStatus: 'PENDING',
    }

    render(
      <BrowserRouter>
        <BookingCard booking={mockBooking} />
      </BrowserRouter>
    )

    expect(screen.getByText(/Badminton/i)).toBeInTheDocument()
    expect(screen.getByText(/SmashZone Arena · Court 1/i)).toBeInTheDocument()
    expect(screen.getByText(/₹350/i)).toBeInTheDocument()
    expect(screen.getByText('⏱ Slot Held')).toBeInTheDocument()
  })

  it('buckets PENDING bookings into pending bucket and CONFIRMED into upcoming', () => {
    expect(bucketOf({ status: 'PENDING' })).toBe('pending')
    expect(bucketOf({ status: 'CONFIRMED' })).toBe('upcoming')
    expect(bucketOf({ status: 'COMPLETED' })).toBe('completed')
    expect(bucketOf({ status: 'CANCELLED' })).toBe('cancelled')
  })
})
