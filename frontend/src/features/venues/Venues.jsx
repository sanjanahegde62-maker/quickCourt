import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { listFacilities } from '../../services/api/venues.api'
import useAsync from '../../hooks/useAsync'
import VenueCard from '../../components/venues/VenueCard'
import VenueComparison from '../../components/venues/VenueComparison'
import { Select } from '../../components/common/Form'
import Button from '../../components/common/Button'
import Pagination from '../../components/common/Pagination'
import { CardSkeleton, EmptyState, ErrorState } from '../../components/common/Feedback'
import Icon from '../../components/common/Icon'
import { PAGE_SIZE, SORT_OPTIONS } from '../../config/endpoints'

const FILTER_KEYS = ['search', 'sport', 'minPrice', 'maxPrice', 'minRating', 'amenity', 'sort']

const QUICK_LOCATIONS = [
  { label: 'All Bengaluru', value: 'Bengaluru' },
  { label: 'Koramangala', value: 'Koramangala' },
  { label: 'Electronic City', value: 'Electronic City' },
  { label: 'Indiranagar', value: 'Indiranagar' },
  { label: 'Whitefield', value: 'Whitefield' },
  { label: 'HSR Layout', value: 'HSR Layout' },
  { label: 'Jayanagar', value: 'Jayanagar' },
]

const SPORTS_TABS = [
  { value: '', label: 'All sports', icon: '🏆' },
  { value: 'BADMINTON', label: 'Badminton', icon: '🏸' },
  { value: 'TENNIS', label: 'Tennis', icon: '🎾' },
  { value: 'FOOTBALL', label: 'Football', icon: '⚽' },
  { value: 'BASKETBALL', label: 'Basketball', icon: '🏀' },
]

const POPULAR_AMENITIES = [
  'Parking',
  'Floodlights',
  'Locker Room',
  'Changing Room',
  'Shower',
  'Cafeteria',
]

const RATING_OPTIONS = [
  { value: '', label: 'Any rating' },
  { value: '4', label: '4.0+ Stars' },
  { value: '4.5', label: '4.5+ Stars' },
]

export default function Venues() {
  const [params, setParams] = useSearchParams()
  const page = Number(params.get('page') || 0)

  // Extract filter parameters from URL
  const urlFilters = useMemo(
    () => Object.fromEntries(FILTER_KEYS.map((k) => [k, params.get(k) || ''])),
    [params],
  )

  // Local state for the location search input
  const [prevSearch, setPrevSearch] = useState(urlFilters.search)
  const [locationInput, setLocationInput] = useState(urlFilters.search)
  if (prevSearch !== urlFilters.search) {
    setPrevSearch(urlFilters.search)
    setLocationInput(urlFilters.search)
  }

  const [geoLoading, setGeoLoading] = useState(false)
  const [geoNotice, setGeoNotice] = useState(null)
  const [compareAlert, setCompareAlert] = useState(null)

  // Selected venues for comparison (up to 4)
  const [selectedToCompare, setSelectedToCompare] = useState([])

  const update = (patch, resetPage = true) => {
    const next = new URLSearchParams(params)
    Object.entries(patch).forEach(([k, v]) => {
      if (v === '' || v == null) {
        next.delete(k)
      } else {
        next.set(k, v)
      }
    })
    if (resetPage) next.delete('page')
    setParams(next, { replace: true })
  }

  // Handle Search Submission (via Search button or Enter key)
  const handleSearchSubmit = (e) => {
    if (e) e.preventDefault()
    const trimmed = locationInput.trim()
    update({ search: trimmed }, true)
  }

  // Handle quick location chip click
  const handleSelectLocation = (locValue) => {
    setLocationInput(locValue)
    update({ search: locValue }, true)
  }

  // Handle Current Location via Browser Geolocation
  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation) {
      setGeoNotice('Geolocation is not supported by your browser.')
      setTimeout(() => setGeoNotice(null), 3500)
      return
    }

    setGeoLoading(true)
    navigator.geolocation.getCurrentPosition(
      () => {
        setGeoLoading(false)
        setLocationInput('Bengaluru')
        update({ search: 'Bengaluru' }, true)
        setGeoNotice('Showing sports facilities in Bengaluru near your detected location.')
        setTimeout(() => setGeoNotice(null), 4000)
      },
      () => {
        setGeoLoading(false)
        setGeoNotice('Location access was denied or timed out. Pick an area below.')
        setTimeout(() => setGeoNotice(null), 4000)
      },
      { timeout: 8000 },
    )
  }

  // Clear all filters and search
  const handleClearAll = () => {
    setLocationInput('')
    setParams({}, { replace: true })
  }

  // Reset secondary filters only (keeps location intact)
  const handleResetSecondaryFilters = () => {
    update({
      sport: '',
      minPrice: '',
      maxPrice: '',
      minRating: '',
      amenity: '',
      sort: '',
    })
  }

  // Venue Comparison Handlers
  const handleToggleCompare = (venue) => {
    setSelectedToCompare((prev) => {
      const exists = prev.some((v) => v.id === venue.id)
      if (exists) {
        return prev.filter((v) => v.id !== venue.id)
      }
      if (prev.length >= 4) {
        setCompareAlert('You can compare a maximum of 4 venues at once.')
        setTimeout(() => setCompareAlert(null), 3500)
        return prev
      }
      return [...prev, venue]
    })
  }

  const handleRemoveCompare = (venueId) => {
    setSelectedToCompare((prev) => prev.filter((v) => v.id !== venueId))
  }

  const handleClearCompareList = () => {
    setSelectedToCompare([])
  }

  // Query Backend API with current filters
  const state = useAsync(
    (signal) => listFacilities({ ...urlFilters, page, size: PAGE_SIZE }, signal),
    [params.toString()],
  )

  const hasAnyFilter = FILTER_KEYS.some((k) => urlFilters[k])
  const hasSecondaryFilters = ['sport', 'minPrice', 'maxPrice', 'minRating', 'amenity', 'sort'].some(
    (k) => urlFilters[k],
  )
  const comparedIds = selectedToCompare.map((v) => v.id)

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Hero / Location Search Section (Watermelon Design) */}
      <section
        aria-label="Venue discovery search"
        className="relative mb-8 overflow-hidden rounded-3xl bg-gradient-to-br from-mint/90 via-sky/60 to-white p-6 shadow-sm border border-slate-200/80 sm:p-8"
      >
        <div className="max-w-3xl">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-court/10 px-3 py-1 text-xs font-semibold text-court mb-3">
            <Icon name="pin" className="h-3.5 w-3.5 text-court" />
            Discover Bengaluru Sports Venues
          </span>
          <h1 className="text-2xl font-black tracking-tight text-navy sm:text-4xl">
            Find & Book Sports Venues Near You
          </h1>
          <p className="mt-2 text-sm sm:text-base text-slate-600">
            Search top facilities across Badminton, Tennis, Football, and Basketball with instant court booking.
          </p>
        </div>

        {/* Primary Location Search Bar */}
        <form onSubmit={handleSearchSubmit} className="mt-6">
          <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4 text-court">
                <Icon name="pin" className="h-5 w-5" />
              </div>
              <input
                type="text"
                value={locationInput}
                onChange={(e) => setLocationInput(e.target.value)}
                placeholder="Enter city, area, or pincode (e.g. Koramangala, Electronic City, 560100)"
                aria-label="Location search"
                className="w-full rounded-2xl border border-slate-300 bg-white py-3.5 pl-11 pr-28 text-sm sm:text-base font-medium text-slate-900 placeholder:text-slate-400 shadow-sm focus:border-court focus:outline-none focus:ring-2 focus:ring-court/20"
              />
              {locationInput && (
                <button
                  type="button"
                  onClick={() => {
                    setLocationInput('')
                    update({ search: '' })
                  }}
                  aria-label="Clear location input"
                  className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition"
                >
                  <Icon name="x" className="h-4 w-4" />
                </button>
              )}
            </div>

            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="md"
                onClick={handleUseCurrentLocation}
                disabled={geoLoading}
                aria-label="Use current location"
                className="shrink-0 bg-white shadow-sm border-slate-300"
              >
                {geoLoading ? (
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-court border-t-transparent" />
                ) : (
                  <Icon name="pin" className="h-4 w-4 text-court" />
                )}
                <span className="hidden sm:inline">Current Location</span>
              </Button>

              <Button
                type="submit"
                variant="primary"
                size="md"
                className="shrink-0 px-6 shadow-md"
              >
                <Icon name="search" className="h-4 w-4" />
                <span>Search</span>
              </Button>
            </div>
          </div>
        </form>

        {/* Geolocation Feedback Notice */}
        {geoNotice && (
          <div
            role="status"
            className="mt-3 flex items-center gap-2 rounded-xl bg-white/95 px-3.5 py-2 text-xs font-medium text-slate-700 shadow-sm border border-slate-200"
          >
            <Icon name="pin" className="h-4 w-4 text-court shrink-0" />
            <span>{geoNotice}</span>
          </div>
        )}

        {/* Quick Location Chips for Bengaluru */}
        <div className="mt-4 flex flex-wrap items-center gap-2 text-xs">
          <span className="font-semibold text-slate-500">Popular Areas:</span>
          {QUICK_LOCATIONS.map((loc) => {
            const isActive =
              urlFilters.search.toLowerCase() === loc.value.toLowerCase() ||
              (loc.value === 'Bengaluru' &&
                (urlFilters.search.toLowerCase() === 'bangalore' ||
                  urlFilters.search.toLowerCase() === 'bengaluru'))
            return (
              <button
                key={loc.value}
                type="button"
                onClick={() => handleSelectLocation(loc.value)}
                className={`rounded-full px-3 py-1 font-medium transition shadow-xs ${
                  isActive
                    ? 'bg-court text-white ring-2 ring-court/30'
                    : 'bg-white/90 text-navy hover:bg-white hover:text-court border border-slate-200/70'
                }`}
              >
                {loc.label}
              </button>
            )
          })}
        </div>
      </section>

      {/* Sport Category Filter Tabs (Badminton, Tennis, Football, Basketball + All) */}
      <section aria-label="Sport category filter" className="mb-6">
        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
          {SPORTS_TABS.map((tab) => {
            const isSelected =
              (!urlFilters.sport && tab.value === '') ||
              urlFilters.sport.toUpperCase() === tab.value.toUpperCase()
            return (
              <button
                key={tab.value || 'all'}
                type="button"
                onClick={() => update({ sport: tab.value })}
                className={`inline-flex items-center gap-2 whitespace-nowrap rounded-2xl px-4 py-2.5 text-sm font-semibold transition shadow-xs ${
                  isSelected
                    ? 'bg-court text-white shadow-md'
                    : 'bg-white text-navy hover:bg-mint/60 border border-slate-200'
                }`}
              >
                <span className="text-base">{tab.icon}</span>
                <span>{tab.label}</span>
              </button>
            )
          })}
        </div>
      </section>

      {/* Advanced Secondary Filter Toolbar */}
      <section
        aria-label="Secondary filters"
        className="mb-8 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs"
      >
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-12 items-end">
          {/* Min Price */}
          <div className="lg:col-span-2">
            <label htmlFor="filter-min-price" className="mb-1 block text-xs font-semibold text-slate-600">
              Min Price (₹)
            </label>
            <input
              id="filter-min-price"
              type="number"
              min="0"
              step="50"
              placeholder="e.g. 300"
              value={urlFilters.minPrice}
              onChange={(e) => update({ minPrice: e.target.value })}
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-court focus:outline-none"
            />
          </div>

          {/* Max Price */}
          <div className="lg:col-span-2">
            <label htmlFor="filter-max-price" className="mb-1 block text-xs font-semibold text-slate-600">
              Max Price (₹)
            </label>
            <input
              id="filter-max-price"
              type="number"
              min="0"
              step="50"
              placeholder="e.g. 1500"
              value={urlFilters.maxPrice}
              onChange={(e) => update({ maxPrice: e.target.value })}
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-court focus:outline-none"
            />
          </div>

          {/* Min Rating */}
          <div className="lg:col-span-2">
            <Select
              label="Min Rating"
              placeholder="Any rating"
              value={urlFilters.minRating}
              onChange={(e) => update({ minRating: e.target.value })}
              options={RATING_OPTIONS}
              className="py-2 text-sm"
            />
          </div>

          {/* Sort By */}
          <div className="lg:col-span-3">
            <Select
              label="Sort by"
              value={urlFilters.sort}
              onChange={(e) => update({ sort: e.target.value })}
              options={SORT_OPTIONS}
              className="py-2 text-sm"
            />
          </div>

          {/* Reset Actions */}
          <div className="flex items-center gap-2 lg:col-span-3 lg:justify-end">
            {hasSecondaryFilters && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleResetSecondaryFilters}
                className="text-xs text-slate-600 hover:text-navy"
              >
                Reset filters
              </Button>
            )}
            {hasAnyFilter && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleClearAll}
                className="text-xs"
              >
                Clear all
              </Button>
            )}
          </div>
        </div>

        {/* Amenity Filter Chips */}
        <div className="mt-3.5 pt-3.5 border-t border-slate-100 flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold text-slate-500">Filter by Amenity:</span>
          {POPULAR_AMENITIES.map((amenity) => {
            const isSelected =
              urlFilters.amenity.toLowerCase() === amenity.toLowerCase()
            return (
              <button
                key={amenity}
                type="button"
                onClick={() =>
                  update({ amenity: isSelected ? '' : amenity })
                }
                className={`rounded-lg px-2.5 py-1 text-xs font-medium transition ${
                  isSelected
                    ? 'bg-court text-white shadow-xs'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                {isSelected ? `✓ ${amenity}` : `+ ${amenity}`}
              </button>
            )
          })}
        </div>
      </section>

      {/* Status Bar / Active Criteria */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2 text-sm text-slate-600">
          {urlFilters.search ? (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-court/10 px-3 py-1 font-semibold text-court">
              <Icon name="pin" className="h-3.5 w-3.5" />
              Showing venues in &quot;{urlFilters.search}&quot;
              <button
                type="button"
                onClick={() => {
                  setLocationInput('')
                  update({ search: '' })
                }}
                className="ml-1 text-court/70 hover:text-court"
                aria-label="Clear location filter"
              >
                <Icon name="x" className="h-3.5 w-3.5" />
              </button>
            </span>
          ) : (
            <span className="font-medium text-slate-700">All available sports venues</span>
          )}

          {state.data && (
            <span className="text-xs text-slate-500">
              ({state.data.total ?? state.data.items?.length ?? 0} {state.data.items?.length === 1 ? 'venue' : 'venues'} found)
            </span>
          )}
        </div>

        {selectedToCompare.length > 0 && (
          <div className="text-xs font-medium text-slate-500">
            {selectedToCompare.length}/4 selected to compare
          </div>
        )}
      </div>

      {/* Floating Comparison Alert */}
      {compareAlert && (
        <div
          role="alert"
          className="fixed top-6 right-6 z-50 rounded-xl bg-navy px-4 py-2.5 text-xs font-medium text-white shadow-lg animate-bounce"
        >
          {compareAlert}
        </div>
      )}

      {/* Venues Grid / States */}
      {state.error ? (
        <ErrorState
          error={state.error}
          onRetry={state.reload}
          title="Unable to load venues"
        />
      ) : state.loading && !state.data ? (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }, (_, i) => (
            <CardSkeleton key={i} />
          ))}
        </div>
      ) : !state.data?.items || state.data.items.length === 0 ? (
        <EmptyState
          icon="search"
          title="No venues found"
          message={
            urlFilters.search
              ? `No sports facilities found matching "${urlFilters.search}". Try searching a popular area like Koramangala, Electronic City, or Indiranagar.`
              : 'No facilities match your active filter criteria. Try resetting your price or sport filters.'
          }
          action={
            <div className="flex flex-wrap items-center justify-center gap-2">
              <Button variant="primary" onClick={handleClearAll}>
                Clear all filters
              </Button>
              <Button
                variant="outline"
                onClick={() => handleSelectLocation('Bengaluru')}
              >
                View all Bengaluru venues
              </Button>
            </div>
          }
        />
      ) : (
        <>
          <div
            className={`grid gap-6 sm:grid-cols-2 lg:grid-cols-3 transition-opacity ${
              state.loading ? 'opacity-60' : 'opacity-100'
            }`}
            aria-busy={state.loading}
          >
            {state.data.items.map((facility) => (
              <VenueCard
                key={facility.id}
                facility={facility}
                isCompared={comparedIds.includes(facility.id)}
                onToggleCompare={handleToggleCompare}
              />
            ))}
          </div>

          {/* Pagination */}
          <div className="mt-8">
            <Pagination
              page={page}
              totalPages={state.data.totalPages}
              onChange={(nextPage) => update({ page: nextPage }, false)}
            />
          </div>
        </>
      )}

      {/* Side-by-Side Venue Comparison Drawer & Modal */}
      <VenueComparison
        selectedVenues={selectedToCompare}
        onRemoveVenue={handleRemoveCompare}
        onClearAll={handleClearCompareList}
      />
    </div>
  )
}
