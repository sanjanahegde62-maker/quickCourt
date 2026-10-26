import { Link } from 'react-router-dom'
import Icon from '../common/Icon'
import Button from '../common/Button'
import { money, titleCase } from '../../utils/format'
import { STATUS } from '../../config/endpoints'

export default function VenueCard({ facility: f }) {
  const photo = f.photos?.[0]
  return (
    <article className="flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white transition hover:shadow-md">
      <div className="relative h-44 bg-gradient-to-br from-mint to-sky">
        {photo ? (
          <img src={photo} alt={`${f.name} photo`} loading="lazy" className="h-full w-full object-cover" />
        ) : (
          <div className="grid h-full place-items-center text-court/60"><Icon name="ball" className="h-14 w-14" /></div>
        )}
        {/* Only shown when the backend actually says the facility is approved */}
        {f.status === STATUS.facilityApproved && (
          <span className="absolute left-3 top-3 rounded-full bg-white/95 px-2.5 py-1 text-xs font-semibold text-court">Verified</span>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-2 p-4">
        <h3 className="text-lg font-bold text-navy">{f.name}</h3>
        {f.location && <p className="flex items-center gap-1.5 text-sm text-slate-600"><Icon name="pin" className="h-4 w-4" />{f.location}</p>}
        {f.sportTypes?.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {f.sportTypes.map((s) => <span key={s} className="rounded-full bg-mint px-2.5 py-0.5 text-xs font-medium text-court">{titleCase(s)}</span>)}
          </div>
        )}
        <div className="mt-auto flex items-center justify-between pt-2 text-sm">
          <span className="flex items-center gap-1 text-slate-700">
            {f.rating != null ? (<><Icon name="star" filled className="h-4 w-4 text-amber-500" /><b>{Number(f.rating).toFixed(1)}</b>{f.reviewCount != null && <span className="text-slate-500">({f.reviewCount})</span>}</>) : <span className="text-slate-500">No ratings yet</span>}
          </span>
          {f.startingPrice != null && <span className="font-semibold text-navy">from {money(f.startingPrice)}/hr</span>}
        </div>
        <Button to={`/venues/${f.id}`} variant="outline" className="mt-2">View Details</Button>
      </div>
    </article>
  )
}

export const VenueLink = ({ id, children }) => <Link to={`/venues/${id}`} className="text-court hover:underline">{children}</Link>
