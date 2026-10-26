import client from './client'
import { ENDPOINTS, PARAMS } from '../../config/endpoints'
import { toPage, toFacility, toCourt, toReview } from '../adapters'

/** Drops empty values so the backend never receives `minPrice=` etc. */
export const clean = (obj) =>
  Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== '' && v !== null && v !== undefined))

export async function listFacilities(filters = {}, signal) {
  const params = clean({
    [PARAMS.search]: filters.search,
    [PARAMS.sport]: filters.sport,
    [PARAMS.minPrice]: filters.minPrice,
    [PARAMS.maxPrice]: filters.maxPrice,
    [PARAMS.minRating]: filters.minRating,
    [PARAMS.sort]: filters.sort,
    [PARAMS.page]: filters.page,
    [PARAMS.size]: filters.size,
  })
  const { data } = await client.get(ENDPOINTS.facilities.list, { params, signal })
  const page = toPage(data, filters.page || 0)
  return { ...page, items: page.items.map(toFacility) }
}

export async function getFacility(id, signal) {
  const { data } = await client.get(ENDPOINTS.facilities.detail(id), { signal })
  return toFacility(data)
}

export async function getFacilityCourts(id, signal) {
  const { data } = await client.get(ENDPOINTS.facilities.courts(id), { signal })
  return toPage(data).items.map(toCourt)
}

export async function getFacilityReviews(id, signal) {
  const { data } = await client.get(ENDPOINTS.facilities.reviews(id), { signal })
  return toPage(data).items.map(toReview)
}
