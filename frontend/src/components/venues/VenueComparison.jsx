import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import Icon from '../common/Icon'
import Button from '../common/Button'
import { money, titleCase } from '../../utils/format'

const SPORT_ICONS = {
  BADMINTON: '🏸',
  TENNIS: '🎾',
  FOOTBALL: '⚽',
  BASKETBALL: '🏀',
}

const DEFAULT_IMAGE =
  'https://images.unsplash.com/photo-1546519638-68e109498ffc?w=800&auto=format&fit=crop&q=80'

export default function VenueComparison({ selectedVenues = [], onRemoveVenue, onClearAll }) {
  const [isOpen, setIsOpen] = useState(false)

  // Close modal on Escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') setIsOpen(false)
    }
    if (isOpen) {
      document.body.style.overflow = 'hidden'
      window.addEventListener('keydown', handleKeyDown)
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen])

  if (!selectedVenues || selectedVenues.length === 0) return null

  // Extract all unique amenities across all selected venues
  const allAmenities = Array.from(
    new Set(selectedVenues.flatMap((v) => (Array.isArray(v.amenities) ? v.amenities : []))),
  ).filter(Boolean)

  return (
    <>
      {/* Floating Bottom Bar */}
      <aside
        aria-label="Venue comparison tray"
        className="fixed bottom-5 left-1/2 z-40 flex w-[94%] max-w-4xl -translate-x-1/2 items-center justify-between gap-4 rounded-2xl border border-slate-200/90 bg-white/95 px-4 py-3 shadow-xl backdrop-blur-md sm:px-6"
      >
        <div className="flex items-center gap-3 overflow-x-auto py-1">
          <div className="flex -space-x-2">
            {selectedVenues.map((v) => (
              <div
                key={v.id}
                className="group relative h-11 w-11 shrink-0 overflow-hidden rounded-full border-2 border-white shadow-sm ring-1 ring-court/30"
                title={v.name}
              >
                <img
                  src={v.photos?.[0] || DEFAULT_IMAGE}
                  alt={v.name}
                  className="h-full w-full object-cover"
                />
                <button
                  type="button"
                  onClick={() => onRemoveVenue(v.id)}
                  aria-label={`Remove ${v.name} from comparison`}
                  className="absolute inset-0 flex items-center justify-center bg-black/60 text-white opacity-0 transition group-hover:opacity-100"
                >
                  <Icon name="x" className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>

          <div className="text-sm">
            <span className="font-bold text-navy">{selectedVenues.length}/4</span>{' '}
            <span className="text-slate-600 hidden sm:inline">venues selected</span>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            onClick={onClearAll}
            className="text-xs font-semibold text-slate-500 hover:text-red-600 transition px-2 py-1"
          >
            Clear all
          </button>
          <Button
            size="sm"
            variant="primary"
            onClick={() => setIsOpen(true)}
            className="shadow-sm"
          >
            Compare Now
          </Button>
        </div>
      </aside>

      {/* Comparison Modal Dialog */}
      {isOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="compare-modal-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-navy/60 p-3 backdrop-blur-sm sm:p-6"
          onClick={() => setIsOpen(false)}
        >
          <div
            className="flex max-h-[92vh] w-full max-w-6xl flex-col rounded-3xl border border-slate-200 bg-white shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <header className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
              <div>
                <h2 id="compare-modal-title" className="text-xl font-bold text-navy">
                  Compare Venues ({selectedVenues.length})
                </h2>
                <p className="text-xs text-slate-500">
                  Compare sports, amenities, pricing and operating details side by side
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                aria-label="Close comparison modal"
                className="rounded-full p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition"
              >
                <Icon name="x" className="h-5 w-5" />
              </button>
            </header>

            {/* Modal Body / Comparison Table */}
            <div className="flex-1 overflow-x-auto overflow-y-auto p-4 sm:p-6">
              <table className="w-full min-w-[640px] border-collapse text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-100">
                    <th scope="col" className="w-36 pb-4 font-semibold text-slate-400 sm:w-44">
                      Feature
                    </th>
                    {selectedVenues.map((v) => (
                      <th key={v.id} scope="col" className="pb-4 px-3 align-top min-w-[200px]">
                        <div className="flex flex-col gap-2">
                          <div className="relative h-28 w-full overflow-hidden rounded-xl bg-slate-100 shadow-sm">
                            <img
                              src={v.photos?.[0] || DEFAULT_IMAGE}
                              alt={v.name}
                              className="h-full w-full object-cover"
                            />
                            <button
                              type="button"
                              onClick={() => onRemoveVenue(v.id)}
                              aria-label={`Remove ${v.name}`}
                              className="absolute top-1.5 right-1.5 rounded-full bg-white/90 p-1 text-slate-600 shadow hover:bg-red-50 hover:text-red-600 transition"
                            >
                              <Icon name="x" className="h-3.5 w-3.5" />
                            </button>
                          </div>
                          <div>
                            <h3 className="font-bold text-navy text-base leading-snug line-clamp-1">
                              {v.name}
                            </h3>
                            <p className="text-xs text-slate-500 line-clamp-1">
                              {v.address || v.location || 'Bengaluru'}
                            </p>
                          </div>
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {/* Rating */}
                  <tr>
                    <th scope="row" className="py-3 font-medium text-slate-500">
                      Rating & Reviews
                    </th>
                    {selectedVenues.map((v) => (
                      <td key={v.id} className="py-3 px-3">
                        {v.rating != null ? (
                          <div className="flex items-center gap-1.5 font-semibold text-slate-800">
                            <Icon name="star" filled className="h-4 w-4 text-amber-500" />
                            <span>{Number(v.rating).toFixed(1)}</span>
                            {v.reviewCount != null && (
                              <span className="text-xs font-normal text-slate-500">
                                ({v.reviewCount} reviews)
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-xs text-slate-400">No ratings yet</span>
                        )}
                      </td>
                    ))}
                  </tr>

                  {/* Starting Price */}
                  <tr>
                    <th scope="row" className="py-3 font-medium text-slate-500">
                      Starting Price
                    </th>
                    {selectedVenues.map((v) => (
                      <td key={v.id} className="py-3 px-3">
                        {v.startingPrice != null ? (
                          <span className="font-bold text-court text-base">
                            {money(v.startingPrice)}
                            <span className="text-xs font-normal text-slate-500"> / hr</span>
                          </span>
                        ) : (
                          <span className="text-xs text-slate-400">Contact venue</span>
                        )}
                      </td>
                    ))}
                  </tr>

                  {/* Sports Available */}
                  <tr>
                    <th scope="row" className="py-3 font-medium text-slate-500">
                      Sports
                    </th>
                    {selectedVenues.map((v) => (
                      <td key={v.id} className="py-3 px-3">
                        <div className="flex flex-wrap gap-1">
                          {v.sportTypes?.map((s) => (
                            <span
                              key={s}
                              className="inline-flex items-center gap-1 rounded-md bg-mint/80 px-2 py-0.5 text-xs font-medium text-court"
                            >
                              <span>{SPORT_ICONS[s] || '🏅'}</span>
                              <span>{titleCase(s)}</span>
                            </span>
                          ))}
                        </div>
                      </td>
                    ))}
                  </tr>

                  {/* Operating Hours */}
                  <tr>
                    <th scope="row" className="py-3 font-medium text-slate-500">
                      Operating Hours
                    </th>
                    {selectedVenues.map((v) => (
                      <td key={v.id} className="py-3 px-3 text-xs text-slate-700">
                        <div className="flex items-center gap-1.5">
                          <Icon name="clock" className="h-3.5 w-3.5 text-slate-400" />
                          <span>{v.operatingHours || '06:00 - 22:00'}</span>
                        </div>
                      </td>
                    ))}
                  </tr>

                  {/* City & Locality */}
                  <tr>
                    <th scope="row" className="py-3 font-medium text-slate-500">
                      Location
                    </th>
                    {selectedVenues.map((v) => (
                      <td key={v.id} className="py-3 px-3 text-xs text-slate-700">
                        <div className="flex items-center gap-1.5">
                          <Icon name="pin" className="h-3.5 w-3.5 text-slate-400" />
                          <span>{v.city ? `${v.address || v.location}, ${v.city}` : (v.address || v.location || 'Bengaluru')}</span>
                        </div>
                      </td>
                    ))}
                  </tr>

                  {/* Amenities comparison rows */}
                  {allAmenities.length > 0 && (
                    <tr>
                      <th
                        colSpan={selectedVenues.length + 1}
                        className="bg-slate-50/80 px-3 py-2 text-xs font-bold uppercase tracking-wider text-slate-500"
                      >
                        Amenities & Facilities
                      </th>
                    </tr>
                  )}
                  {allAmenities.map((amenity) => (
                    <tr key={amenity}>
                      <th scope="row" className="py-2.5 font-normal text-slate-600 pl-2">
                        {amenity}
                      </th>
                      {selectedVenues.map((v) => {
                        const hasAmenity = (v.amenities || []).some(
                          (a) => a.toLowerCase() === amenity.toLowerCase(),
                        )
                        return (
                          <td key={v.id} className="py-2.5 px-3">
                            {hasAmenity ? (
                              <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600">
                                <Icon name="check" className="h-4 w-4" /> Included
                              </span>
                            ) : (
                              <span className="text-slate-300">—</span>
                            )}
                          </td>
                        )
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Modal Footer Actions */}
            <footer className="flex items-center justify-between border-t border-slate-100 bg-slate-50/70 px-6 py-4">
              <button
                type="button"
                onClick={onClearAll}
                className="text-xs font-medium text-slate-500 hover:text-red-600 transition"
              >
                Clear all comparisons
              </button>
              <div className="flex gap-2">
                {selectedVenues.map((v) => (
                  <Link
                    key={v.id}
                    to={`/venues/${v.id}`}
                    onClick={() => setIsOpen(false)}
                    className="inline-flex items-center gap-1 rounded-xl bg-court px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-emerald-700 transition"
                  >
                    <span>Book {v.name.split(' ')[0]}</span>
                    <Icon name="chevronRight" className="h-3.5 w-3.5" />
                  </Link>
                ))}
              </div>
            </footer>
          </div>
        </div>
      )}
    </>
  )
}
