import { useNavigate, useParams } from 'react-router-dom'
import { getFacility, getFacilityCourts, getFacilityReviews } from '../../services/api/venues.api'
import useAsync from '../../hooks/useAsync'
import { useAuth } from '../../auth/AuthProvider'
import CourtCard from '../../components/booking/CourtCard'
import Icon from '../../components/common/Icon'
import { EmptyState, ErrorState, ListSkeleton, PageSpinner } from '../../components/common/Feedback'
import { FEATURES } from '../../config/endpoints'
import { dateLong, titleCase } from '../../utils/format'
import ReviewForm from '../reviews/ReviewForm'

export default function VenueDetails() {
  const { facilityId } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const facility = useAsync((s) => getFacility(facilityId, s), [facilityId])
  const courts = useAsync((s) => getFacilityCourts(facilityId, s), [facilityId])
  const reviews = useAsync((s) => getFacilityReviews(facilityId, s), [facilityId], { enabled: FEATURES.reviews })

  if (facility.loading && !facility.data) return <PageSpinner />
  if (facility.error) return <div className="mx-auto max-w-3xl px-4 py-12"><ErrorState error={facility.error} onRetry={facility.reload} /></div>
  const f = facility.data

  // Unauthenticated players are sent to login and returned to the booking page afterwards.
  const book = (court) => {
    const to = `/book/${court.id}`
    if (!user) navigate('/login', { state: { from: { pathname: to, search: `?facility=${facilityId}` } } })
    else navigate(to, { state: { facilityName: f.name, court } })
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="grid gap-3 sm:grid-cols-3">
        {f.photos.length ? f.photos.slice(0, 3).map((p, i) => (
          <img key={p} src={p} alt={`${f.name} photo ${i + 1}`} className={`h-56 w-full rounded-2xl object-cover ${i === 0 ? 'sm:col-span-2 sm:row-span-1' : ''}`} />
        )) : (
          <div className="grid h-56 place-items-center rounded-2xl bg-gradient-to-br from-mint to-sky text-court/60 sm:col-span-3"><Icon name="ball" className="h-16 w-16" /></div>
        )}
      </div>

      <div className="mt-6 grid gap-8 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <h1 className="text-3xl font-bold">{f.name}</h1>
          <p className="mt-2 flex items-center gap-1.5 text-slate-600"><Icon name="pin" className="h-4 w-4" />{f.address || f.location || 'Location not provided'}</p>
          <p className="mt-2 flex items-center gap-1 text-sm">
            {f.rating != null ? <><Icon name="star" filled className="h-4 w-4 text-amber-500" /><b>{Number(f.rating).toFixed(1)}</b><span className="text-slate-500">({f.reviewCount ?? 0} reviews)</span></> : <span className="text-slate-500">No ratings yet</span>}
          </p>
          {f.description && <p className="mt-4 whitespace-pre-line text-slate-700">{f.description}</p>}
          {f.sportTypes.length > 0 && <div className="mt-4 flex flex-wrap gap-2">{f.sportTypes.map((s) => <span key={s} className="rounded-full bg-mint px-3 py-1 text-sm font-medium text-court">{titleCase(s)}</span>)}</div>}
          {(f.openingTime || f.closingTime) && <p className="mt-4 flex items-center gap-2 text-sm text-slate-700"><Icon name="clock" className="h-4 w-4" />Open {String(f.openingTime || '').slice(0, 5)} – {String(f.closingTime || '').slice(0, 5)}</p>}
        </div>

        <aside className="rounded-2xl bg-sky/60 p-5">
          <h2 className="mb-3 text-lg font-bold">Courts</h2>
          {courts.error ? <ErrorState error={courts.error} onRetry={courts.reload} />
            : courts.loading && !courts.data ? <ListSkeleton rows={2} />
              : courts.data?.length === 0 ? <EmptyState title="No courts yet" message="This venue has not added any courts." />
                : <div className="space-y-3">{courts.data.map((c) => <CourtCard key={c.id} court={c} onBook={book} />)}</div>}
        </aside>
      </div>

      {FEATURES.reviews && (
        <section className="mt-10">
          <h2 className="text-xl font-bold">Reviews</h2>
          <div className="mt-4 space-y-3">
            {reviews.error ? <ErrorState error={reviews.error} onRetry={reviews.reload} title="Could not load reviews" />
              : reviews.loading && !reviews.data ? <ListSkeleton rows={2} />
                : reviews.data?.length === 0 ? <p className="text-sm text-slate-600">No reviews yet.</p>
                  : reviews.data.map((r) => (
                    <article key={r.id ?? `${r.userName}-${r.createdAt}`} className="rounded-2xl border border-slate-200 bg-white p-4">
                      <p className="flex items-center gap-1 text-sm font-semibold text-navy">
                        <Icon name="star" filled className="h-4 w-4 text-amber-500" />{r.rating} <span className="font-normal text-slate-500">· {r.userName || 'Player'} {r.createdAt ? `· ${dateLong(r.createdAt)}` : ''}</span>
                      </p>
                      {/* React escapes text, so user-written comments are never rendered as HTML */}
                      {r.comment && <p className="mt-1 text-sm text-slate-700">{r.comment}</p>}
                    </article>
                  ))}
          </div>
          {user?.role === 'player' && <ReviewForm facilityId={facilityId} onDone={reviews.reload} />}
        </section>
      )}
    </div>
  )
}
