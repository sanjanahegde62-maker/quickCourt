import client from './client'
import { ENDPOINTS } from '../../config/endpoints'
import { pick, toPayment } from '../adapters'

/** Retrieves public Razorpay configuration (keyId, configured status, currency) */
export async function getPaymentConfig(signal) {
  try {
    const { data } = await client.get(ENDPOINTS.payments.config, { signal })
    return {
      configured: Boolean(data?.configured),
      keyId: data?.keyId || '',
      currency: data?.currency || 'INR',
      webhookConfigured: Boolean(data?.webhookConfigured),
    }
  } catch {
    return {
      configured: false,
      keyId: '',
      currency: 'INR',
      webhookConfigured: false,
    }
  }
}

/** Creates or retrieves a server-generated Razorpay Order for a pending booking. */
export async function createRazorpayOrder(bookingId) {
  const { data } = await client.post(ENDPOINTS.payments.order, { bookingId })
  return data
}

/** Authoritatively verifies Razorpay payment signature on backend. */
export async function verifyRazorpayPayment({ bookingId, razorpayOrderId, razorpayPaymentId, razorpaySignature }) {
  const { data } = await client.post(ENDPOINTS.payments.verify, {
    bookingId,
    razorpayOrderId,
    razorpayPaymentId,
    razorpaySignature,
  })
  return toPayment(data)
}

/** Optional: only if the backend exposes demo payment methods. Returns null otherwise. */
export async function getPaymentMethods(signal) {
  if (!ENDPOINTS.payments.methods) return null
  const { data } = await client.get(ENDPOINTS.payments.methods, { signal })
  const list = Array.isArray(data) ? data : pick(data, 'methods', 'content', 'items') || []
  return list.map((m) => (typeof m === 'string' ? { code: m, label: m } : { code: pick(m, 'code', 'id', 'name'), label: pick(m, 'label', 'name', 'code') }))
}

/** Submits a payment request. */
export async function createPayment({ bookingId, paymentMethod, razorpayOrderId, razorpayPaymentId, razorpaySignature }) {
  const { data } = await client.post(ENDPOINTS.payments.create, {
    bookingId,
    paymentMethod,
    razorpayOrderId,
    razorpayPaymentId,
    razorpaySignature,
  })
  return toPayment(data)
}

export async function getPayment(id, signal) {
  const { data } = await client.get(ENDPOINTS.payments.detail(id), { signal })
  return toPayment(data)
}
