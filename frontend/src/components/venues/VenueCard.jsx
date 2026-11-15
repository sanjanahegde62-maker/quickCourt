import { useState } from 'react'
import { Link } from 'react-router-dom'
import Icon from '../common/Icon'
import Button from '../common/Button'
import { money, titleCase } from '../../utils/format'
import { STATUS } from '../../config/endpoints'

const SPORT_ICONS = {
  BADMINTON: '🏸',
  TENNIS: '🎾',
  FOOTBALL: '⚽',
  BASKETBALL: '🏀',
}

const DEFAULT_IMAGE =
  'https://images.unsplash.com/photo-1546519638-68e109498ffc?w=800&auto=format&fit=crop&q=80'

export default function VenueCard({
  facility: f,
  isCompared = false,
  onToggleCompare,
}) {
  const [imgError, setImgError] = useState(false)
  const photo = !imgError && f.photos?.[0] ? f.photos[0] : DEFAULT_IMAGE

  // Location string: area/address and city
  const displayLocation = f.city
    ? `${f.address || f.location}, ${f.city}`
    : (f.address || f.location || 'Bengaluru')

  // Key amenities (show up to 3)
  const amenities = Array.isArray(f.amenities) ? f.amenities : []
  const visibleAmenities = amenities.slice(0, 3)
  const remainingCount = amenities.length - visibleAmenities.length

  return (
    <article className="group relative flex flex-col overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl">
      {/* Cover Image Container */}
      <div className="relative h-48 w-full overflow-hidden bg-slate-100 sm:h-52">
        <img
          src={photo}
          alt={`${f.name} photo`}
          onError={() => setImgError(true)}
          loading="lazy"
          className="h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-105"
        />

        {/* Gradient shadow overlay for badge readability */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent opacity-80" />

        {/* Top-left Badges */}
        <div className="absolute top-3 left-3 flex flex-wrap gap-1.5">
          {f.status === STATUS.facilityApproved && (
            <span className="inline-flex items-center gap-1 rounded-full bg-white/95 px-2.5 py-1 text-xs font-bold text-court shadow-sm backdrop-blur-md">
              <Icon name="check" className="h-3.5 w-3.5 text-court" />
              Verified
            </span>
          )}
        </div>

        {/* Top-right Compare Toggle */}
        {onToggleCompare && (
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              onToggleCompare(f)
            }}
            aria-pressed={isCompared}
            aria-label={isCompared ? `Remove ${f.name} from comparison` : `Add ${f.name} to comparison`}
            className={`absolute top-3 right-3 inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold shadow-md transition backdrop-blur-md ${
              isCompared
                ? 'bg-court text-white ring-2 ring-white/80'
                : 'bg-white/95 text-navy hover:bg-white hover:text-court'
            }`}
          >
            {isCompared ? (
              <>
                <Icon name="check" className="h-3.5 w-3.5" />
                <span>Added</span>
              </>
            ) : (
              <>
                <Icon name="plus" className="h-3.5 w-3.5" />
                <span>Compare</span>
              </>
            )}
          </button>
        )}

        {/* Bottom Image Overlay: Starting Price Tag */}
        {f.startingPrice != null && (
          <div className="absolute bottom-3 left-3 rounded-lg bg-black/60 px-2.5 py-1 text-xs font-medium text-white backdrop-blur-md">
            From <span className="font-bold text-white text-sm">{money(f.startingPrice)}</span>/hr
          </div>
        )}

        {/* Bottom Image Overlay: Rating Badge */}
        <div className="absolute bottom-3 right-3 flex items-center gap-1 rounded-lg bg-black/60 px-2.5 py-1 text-xs font-semibold text-white backdrop-blur-md">
          {f.rating != null ? (
            <>
              <Icon name="star" filled className="h-3.5 w-3.5 text-amber-400" />
              <span>{Number(f.rating).toFixed(1)}</span>
              {f.reviewCount != null && (
                <span className="text-white/80 font-normal">({f.reviewCount})</span>
              )}
            </>
          ) : (
            <span className="text-white/80 font-normal">★ New</span>
          )}
        </div>
      </div>

      {/* Card Content */}
      <div className="flex flex-1 flex-col gap-2.5 p-4 sm:p-5">
        {/* Title */}
        <Link to={`/venues/${f.id}`} className="group-hover:text-court transition-colors">
          <h3 className="text-lg font-bold text-navy leading-snug line-clamp-1">
            {f.name}
          </h3>
        </Link>

        {/* Location */}
        <p className="flex items-center gap-1.5 text-xs sm:text-sm text-slate-500 line-clamp-1">
          <Icon name="pin" className="h-4 w-4 shrink-0 text-slate-400" />
          <span>{displayLocation}</span>
        </p>

        {/* Sports Available Badges */}
        {f.sportTypes?.length > 0 && (
          <div className="flex flex-wrap gap-1.5 pt-1">
            {f.sportTypes.map((s) => (
              <span
                key={s}
                className="inline-flex items-center gap-1 rounded-md bg-mint/80 px-2 py-0.5 text-xs font-medium text-court"
              >
                <span>{SPORT_ICONS[s] || '🏅'}</span>
                <span>{titleCase(s)}</span>
              </span>
            ))}
          </div>
        )}

        {/* Key Amenities */}
        {visibleAmenities.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5 text-xs text-slate-600">
            {visibleAmenities.map((amenity) => (
              <span
                key={amenity}
                className="rounded-md border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] font-medium text-slate-600"
              >
                {amenity}
              </span>
            ))}
            {remainingCount > 0 && (
              <span className="text-[11px] text-slate-400 font-medium">
                +{remainingCount} more
              </span>
            )}
          </div>
        )}

        {/* Operating Hours or Courtyard Note */}
        {f.operatingHours && (
          <div className="flex items-center gap-1 text-[11px] text-slate-400 mt-auto pt-1">
            <Icon name="clock" className="h-3.5 w-3.5" />
            <span>Open: {f.operatingHours}</span>
          </div>
        )}

        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100">
          <Button
            to={`/venues/${f.id}`}
            variant="outline"
            size="sm"
            className="w-full text-xs font-semibold"
          >
            Details
          </Button>
          <Button
            to={`/venues/${f.id}`}
            variant="primary"
            size="sm"
            className="w-full text-xs font-semibold shadow-sm"
          >
            Book Now
          </Button>
        </div>
      </div>
    </article>
  )
}

export const VenueLink = ({ id, children }) => (
  <Link to={`/venues/${id}`} className="text-court hover:underline">
    {children}
  </Link>
)
