import client from './client'
import { ENDPOINTS } from '../../config/endpoints'
import { pick, toPayment } from '../adapters'

/** Optional: only if the backend exposes demo payment methods. Returns null otherwise. */
export async function getPaymentMethods(signal) {
  if (!ENDPOINTS.payments.methods) return null
  const { data } = await client.get(ENDPOINTS.payments.methods, { signal })
  const list = Array.isArray(data) ? data : pick(data, 'methods', 'content', 'items') || []
  return list.map((m) => (typeof m === 'string' ? { code: m, label: m } : { code: pick(m, 'code', 'id', 'name'), label: pick(m, 'label', 'name', 'code') }))
}

/** Submits a DEMO payment. The result shown to the user is whatever the backend returns. */
export async function createPayment({ bookingId, paymentMethod }) {
  const { data } = await client.post(ENDPOINTS.payments.create, { bookingId, paymentMethod })
  return toPayment(data)
}

export async function getPayment(id, signal) {
  const { data } = await client.get(ENDPOINTS.payments.detail(id), { signal })
  return toPayment(data)
}
