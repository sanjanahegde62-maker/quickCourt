import { describe, expect, it, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import VenueCard from '../components/venues/VenueCard'
import VenueComparison from '../components/venues/VenueComparison'

const mockVenue1 = {
  id: 1,
  name: 'Koramangala Smash Arena',
  location: '80 Feet Road, Koramangala',
  address: '80 Feet Road, Koramangala',
  city: 'Bengaluru',
  pincode: '560034',
  rating: 4.8,
  reviewCount: 142,
  sportTypes: ['BADMINTON', 'TENNIS'],
  startingPrice: 350,
  amenities: ['Parking', 'Floodlights', 'Locker Room'],
  operatingHours: '06:00 - 23:00',
  status: 'APPROVED',
  photos: ['https://example.com/photo1.jpg'],
}

const mockVenue2 = {
  id: 2,
  name: 'Electronic City Turf Park',
  location: 'Phase 1, Electronic City',
  address: 'Phase 1, Electronic City',
  city: 'Bengaluru',
  pincode: '560100',
  rating: 4.6,
  reviewCount: 88,
  sportTypes: ['FOOTBALL', 'BASKETBALL'],
  startingPrice: 800,
  amenities: ['Parking', 'Floodlights', 'Shower'],
  operatingHours: '05:30 - 23:30',
  status: 'APPROVED',
  photos: [],
}

describe('VenueCard', () => {
  it('renders all key venue details correctly', () => {
    render(
      <MemoryRouter>
        <VenueCard facility={mockVenue1} />
      </MemoryRouter>,
    )

    expect(screen.getByText('Koramangala Smash Arena')).toBeInTheDocument()
    expect(screen.getByText(/80 Feet Road, Koramangala, Bengaluru/)).toBeInTheDocument()
    expect(screen.getByText('4.8')).toBeInTheDocument()
    expect(screen.getByText('(142)')).toBeInTheDocument()
    expect(screen.getByText('Badminton')).toBeInTheDocument()
    expect(screen.getByText('Tennis')).toBeInTheDocument()
    expect(screen.getByText('Parking')).toBeInTheDocument()
    expect(screen.getByText('Verified')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Details/i })).toHaveAttribute('href', '/venues/1')
    expect(screen.getByRole('link', { name: /Book Now/i })).toHaveAttribute('href', '/venues/1')
  })

  it('handles missing optional fields gracefully', () => {
    const minimalVenue = {
      id: 99,
      name: 'Minimal Venue',
      status: 'PENDING',
    }
    render(
      <MemoryRouter>
        <VenueCard facility={minimalVenue} />
      </MemoryRouter>,
    )

    expect(screen.getByText('Minimal Venue')).toBeInTheDocument()
    expect(screen.queryByText('Verified')).not.toBeInTheDocument()
    expect(screen.getByText('★ New')).toBeInTheDocument()
  })

  it('triggers onToggleCompare callback when compare button is clicked', () => {
    const handleToggle = vi.fn()
    render(
      <MemoryRouter>
        <VenueCard facility={mockVenue1} isCompared={false} onToggleCompare={handleToggle} />
      </MemoryRouter>,
    )

    const compareBtn = screen.getByRole('button', { name: /Add Koramangala Smash Arena to comparison/i })
    fireEvent.click(compareBtn)
    expect(handleToggle).toHaveBeenCalledTimes(1)
    expect(handleToggle).toHaveBeenCalledWith(mockVenue1)
  })

  it('shows Added state when venue is already compared', () => {
    render(
      <MemoryRouter>
        <VenueCard facility={mockVenue1} isCompared={true} onToggleCompare={vi.fn()} />
      </MemoryRouter>,
    )

    expect(screen.getByRole('button', { name: /Remove Koramangala Smash Arena from comparison/i })).toBeInTheDocument()
    expect(screen.getByText('Added')).toBeInTheDocument()
  })
})

describe('VenueComparison', () => {
  it('does not render tray when no venues are selected', () => {
    const { container } = render(
      <MemoryRouter>
        <VenueComparison selectedVenues={[]} onRemoveVenue={vi.fn()} onClearAll={vi.fn()} />
      </MemoryRouter>,
    )
    expect(container.firstChild).toBeNull()
  })

  it('renders floating tray with selected venues count and opens modal', () => {
    const handleRemove = vi.fn()
    const handleClear = vi.fn()

    render(
      <MemoryRouter>
        <VenueComparison
          selectedVenues={[mockVenue1, mockVenue2]}
          onRemoveVenue={handleRemove}
          onClearAll={handleClear}
        />
      </MemoryRouter>,
    )

    expect(screen.getByText('2/4')).toBeInTheDocument()
    expect(screen.getByText('venues selected')).toBeInTheDocument()

    // Open comparison modal
    const compareBtn = screen.getByRole('button', { name: /Compare Now/i })
    fireEvent.click(compareBtn)

    // Modal should now be open
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(screen.getByText('Compare Venues (2)')).toBeInTheDocument()
    expect(screen.getByText('Operating Hours')).toBeInTheDocument()
    expect(screen.getByText('06:00 - 23:00')).toBeInTheDocument()
    expect(screen.getByText('05:30 - 23:30')).toBeInTheDocument()

    // Remove venue from modal
    const removeBtns = screen.getAllByRole('button', { name: /Remove /i })
    expect(removeBtns.length).toBeGreaterThan(0)
    fireEvent.click(removeBtns[0])
    expect(handleRemove).toHaveBeenCalled()
  })
})
