import { useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { listFacilities } from '../../services/api/venues.api'
import useAsync from '../../hooks/useAsync'
import useDebounce from '../../hooks/useDebounce'
import VenueCard from '../../components/venues/VenueCard'
import { Input, Select } from '../../components/common/Form'
import Button from '../../components/common/Button'
import Pagination from '../../components/common/Pagination'
import { CardSkeleton, EmptyState, ErrorState } from '../../components/common/Feedback'
import PageHeader from '../../components/common/PageHeader'
import { PAGE_SIZE, SORT_OPTIONS, SPORTS_FALLBACK } from '../../config/endpoints'
import { titleCase } from '../../utils/format'

const KEYS = ['search', 'sport', 'minPrice', 'maxPrice', 'minRating', 'sort']

export default function Venues() {
  const [params, setParams] = useSearchParams()
  const page = Number(params.get('page') || 0)
  const urlFilters = useMemo(() => Object.fromEntries(KEYS.map((k) => [k, params.get(k) || ''])), [params])

  // The search box is local state, debounced into the URL so stale requests are cancelled.
  const [searchText, setSearchText] = useState(urlFilters.search)
  const debounced = useDebounce(searchText)
  useEffect(() => {
    if (debounced !== urlFilters.search) update({ search: debounced }, true)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debounced])

  const update = (patch, resetPage = true) => {
    const next = new URLSearchParams(params)
    Object.entries(patch).forEach(([k, v]) => (v === '' || v == null ? next.delete(k) : next.set(k, v)))
    if (resetPage) next.delete('page')
    setParams(next, { replace: true })
  }

  const state = useAsync(
    (signal) => listFacilities({ ...urlFilters, page, size: PAGE_SIZE }, signal),
    [params.toString()],
  )
  const hasFilters = KEYS.some((k) => urlFilters[k])
  const clear = () => { setSearchText(''); setParams({}, { replace: true }) }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <PageHeader title="Explore venues" subtitle="Search by name or location, then filter by sport, price and rating." />
      <div className="mb-6 grid gap-3 rounded-2xl bg-mint/70 p-4 sm:grid-cols-2 lg:grid-cols-6">
        <div className="lg:col-span-2">
          <Input label="Search" placeholder="Venue name or location" value={searchText} onChange={(e) => setSearchText(e.target.value)} />
        </div>
        <Select label="Sport" placeholder="All sports" value={urlFilters.sport} onChange={(e) => update({ sport: e.target.value })}
          options={SPORTS_FALLBACK.map((s) => ({ value: s, label: titleCase(s) }))} />
        <Input label="Min price" type="number" min="0" value={urlFilters.minPrice} onChange={(e) => update({ minPrice: e.target.value })} />
        <Input label="Max price" type="number" min="0" value={urlFilters.maxPrice} onChange={(e) => update({ maxPrice: e.target.value })} />
        <Select label="Min rating" placeholder="Any" value={urlFilters.minRating} onChange={(e) => update({ minRating: e.target.value })} options={['3', '4', '4.5']} />
        <div className="sm:col-span-2 lg:col-span-2">
          <Select label="Sort by" value={urlFilters.sort} onChange={(e) => update({ sort: e.target.value })} options={SORT_OPTIONS} />
        </div>
        {hasFilters && <div className="flex items-end"><Button variant="outline" onClick={clear}>Clear filters</Button></div>}
      </div>

      {state.error ? (
        <ErrorState error={state.error} onRetry={state.reload} />
      ) : state.loading && !state.data ? (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{Array.from({ length: 6 }, (_, i) => <CardSkeleton key={i} />)}</div>
      ) : state.data?.items.length === 0 ? (
        <EmptyState icon="search" title="No venues found" message="Try a different search or clear your filters."
          action={hasFilters && <Button onClick={clear}>Clear filters</Button>} />
      ) : (
        <>
          <div className={`grid gap-5 sm:grid-cols-2 lg:grid-cols-3 ${state.loading ? 'opacity-60' : ''}`} aria-busy={state.loading}>
            {state.data?.items.map((f) => <VenueCard key={f.id} facility={f} />)}
          </div>
          <Pagination page={page} totalPages={state.data?.totalPages} onChange={(p) => update({ page: p }, false)} />
        </>
      )}
    </div>
  )
}
