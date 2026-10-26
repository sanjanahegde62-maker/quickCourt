import client from './client'
import { ENDPOINTS, PARAMS } from '../../config/endpoints'
import { pick, toCourt, toSlot } from '../adapters'

export async function getCourt(id, signal) {
  const { data } = await client.get(ENDPOINTS.courts.detail(id), { signal })
  return toCourt(data)
}

/** Availability ALWAYS comes from the backend; nothing is computed on the client. */
export async function getAvailability(courtId, date, signal) {
  const { data } = await client.get(ENDPOINTS.courts.availability(courtId), {
    params: { [PARAMS.date]: date },
    signal,
  })
  const list = Array.isArray(data) ? data : pick(data, 'slots', 'content', 'items', 'data') || []
  return list.map(toSlot)
}
