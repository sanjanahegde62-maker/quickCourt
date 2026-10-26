import client from './client'
import { ENDPOINTS } from '../../config/endpoints'
import { toBooking, toPage } from '../adapters'

/** Payload shape is a guess from the spec: adjust after auditing the booking DTO. */
export async function createBooking({ courtId, slotId, date }) {
  const { data } = await client.post(ENDPOINTS.bookings.create, { courtId, slotId, date })
  return toBooking(data)
}

export async function listMyBookings(signal) {
  const { data } = await client.get(ENDPOINTS.bookings.mine, { signal })
  return toPage(data).items.map(toBooking)
}

export async function getBooking(id, signal) {
  const { data } = await client.get(ENDPOINTS.bookings.detail(id), { signal })
  return toBooking(data)
}

export async function cancelBooking(id) {
  const { data } = await client.post(ENDPOINTS.bookings.cancel(id))
  return data ? toBooking(data) : null
}
