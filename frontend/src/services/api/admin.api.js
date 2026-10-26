import client from './client'
import { ENDPOINTS, PARAMS } from '../../config/endpoints'
import { clean } from './venues.api'
import { toBooking, toFacility, toPage, toUser } from '../adapters'

export async function listAdminFacilities(status, signal) {
  const { data } = await client.get(ENDPOINTS.admin.facilities, {
    params: clean({ [PARAMS.status]: status }),
    signal,
  })
  return toPage(data).items.map(toFacility)
}
export async function approveFacility(id) {
  const { data } = await client.post(ENDPOINTS.admin.approve(id))
  return data
}
export async function rejectFacility(id, reason) {
  const { data } = await client.post(ENDPOINTS.admin.reject(id), { reason })
  return data
}
export async function listUsers({ search, role, status } = {}, signal) {
  const { data } = await client.get(ENDPOINTS.admin.users, {
    params: clean({ [PARAMS.search]: search, [PARAMS.role]: role, [PARAMS.status]: status }),
    signal,
  })
  return toPage(data).items.map(toUser)
}
export async function setUserStatus(id, status) {
  const { data } = await client.patch(ENDPOINTS.admin.userStatus(id), { status })
  return data
}
export async function listAdminBookings({ search, status, date } = {}, signal) {
  const { data } = await client.get(ENDPOINTS.admin.bookings, {
    params: clean({ [PARAMS.search]: search, [PARAMS.status]: status, [PARAMS.date]: date }),
    signal,
  })
  return toPage(data).items.map(toBooking)
}
export async function getAdminAnalytics(signal) {
  const { data } = await client.get(ENDPOINTS.admin.analytics, { signal })
  return data
}
