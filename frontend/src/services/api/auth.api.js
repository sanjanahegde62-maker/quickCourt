import client, { tokenStore } from './client'
import { ENDPOINTS, FEATURES } from '../../config/endpoints'
import { pick, toUser } from '../adapters'

export async function login({ email, password }) {
  const { data } = await client.post(ENDPOINTS.auth.login, { email, password })
  const token = pick(data, 'token', 'accessToken', 'jwt')
  if (token) tokenStore.set(token)
  // Some backends return the user inline, others need a follow-up call.
  const inline = pick(data, 'user') || (pick(data, 'email') ? data : null)
  const user = inline ? toUser(inline) : await getMe()
  return { user, needsOtp: pick(data, 'otpRequired', 'requiresOtp') === true }
}

export async function register(payload) {
  const { data } = await client.post(ENDPOINTS.auth.register, payload)
  return data
}

export async function requestOtp(payload) {
  const { data } = await client.post(ENDPOINTS.auth.otpRequest, payload)
  return data
}

export async function verifyOtp(payload) {
  const { data } = await client.post(ENDPOINTS.auth.otpVerify, payload)
  const token = pick(data, 'token', 'accessToken', 'jwt')
  if (token) tokenStore.set(token)
  return data
}

export async function logout() {
  try {
    if (FEATURES.serverLogout) await client.post(ENDPOINTS.auth.logout)
  } finally {
    tokenStore.clear()
  }
}

export async function getMe(signal) {
  const { data } = await client.get(ENDPOINTS.auth.me, { signal })
  return toUser(data)
}

export async function updateMe(payload) {
  const { data } = await client.patch(ENDPOINTS.auth.me, payload)
  return toUser(data)
}
