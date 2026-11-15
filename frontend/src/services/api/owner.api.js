import client from './client'
import { ENDPOINTS } from '../../config/endpoints'
import { toBooking, toCourt, toFacility, toPage } from '../adapters'

export async function listOwnerFacilities(signal) {
  const { data } = await client.get(ENDPOINTS.owner.facilities, { signal })
  return toPage(data).items.map(toFacility)
}
export async function createFacility(payload) {
  const { data } = await client.post(ENDPOINTS.owner.facilities, payload)
  return toFacility(data)
}
export async function updateFacility(id, payload) {
  const { data } = await client.patch(ENDPOINTS.owner.facility(id), payload)
  return toFacility(data)
}
export async function listOwnerCourts(facilityId, signal) {
  const { data } = await client.get(ENDPOINTS.owner.courts(facilityId), { signal })
  return toPage(data).items.map(toCourt)
}
export async function createCourt(facilityId, payload) {
  const { data } = await client.post(ENDPOINTS.owner.courts(facilityId), payload)
  return toCourt(data)
}
export async function updateCourt(id, payload) {
  const { data } = await client.patch(ENDPOINTS.owner.court(id), payload)
  return toCourt(data)
}
export async function setAvailability(courtId, payload) {
  const { data } = await client.put(ENDPOINTS.owner.availability(courtId), payload)
  return data
}
export async function blockSlots(courtId, payload) {
  const { data } = await client.post(ENDPOINTS.owner.blocks(courtId), payload)
  return data
}
export async function listOwnerBookings(params = {}, signal) {
  const { data } = await client.get(ENDPOINTS.owner.bookings, { params, signal })
  return toPage(data).items.map(toBooking)
}
export async function getOwnerBooking(id, signal) {
  const { data } = await client.get(ENDPOINTS.owner.booking(id), { signal })
  return toBooking(data)
}
export async function updateOwnerBookingStatus(bookingId, status) {
  const { data } = await client.patch(ENDPOINTS.owner.bookingStatus(bookingId), { status })
  return toBooking(data)
}
export async function cancelOwnerBooking(bookingId) {
  const { data } = await client.post(ENDPOINTS.owner.bookingCancel(bookingId))
  return toBooking(data)
}
export async function getOwnerAnalytics(signal) {
  const { data } = await client.get(ENDPOINTS.owner.analytics, { signal })
  return data
}
