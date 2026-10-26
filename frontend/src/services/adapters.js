/**
 * Response adapters. They translate backend DTO field names into the shapes the UI uses.
 * Field names tried here are GUESSES from the spec; adjust after auditing the DTOs.
 * Unknown fields stay undefined and the UI simply hides them (no fake values).
 */
import { ROLE_MAP, STATUS } from '../config/endpoints'

export const pick = (obj, ...keys) => {
  if (!obj) return undefined
  for (const k of keys) if (obj[k] !== undefined && obj[k] !== null) return obj[k]
  return undefined
}

export const upper = (v) => (typeof v === 'string' ? v.toUpperCase() : v)

export function normalizeRole(raw) {
  const r = String(Array.isArray(raw) ? raw[0] : raw ?? '').toUpperCase().replace(/^ROLE_/, '')
  return ROLE_MAP[r] || null
}

export function toUser(d) {
  if (!d) return null
  return {
    id: pick(d, 'id', 'userId'),
    name: pick(d, 'name', 'fullName', 'username'),
    email: pick(d, 'email'),
    phone: pick(d, 'phone', 'phoneNumber', 'mobile'),
    role: normalizeRole(pick(d, 'role', 'roles', 'authorities')),
    rawRole: pick(d, 'role'),
    status: upper(pick(d, 'status')),
    verified: pick(d, 'verified', 'emailVerified', 'isVerified'),
  }
}

/** Accepts a Spring Page ({content,totalPages,...}), {items,...}, {data:[...]} or a plain array. */
export function toPage(d, page = 0) {
  if (Array.isArray(d)) return { items: d, page, totalPages: 1, total: d.length }
  const items = pick(d, 'content', 'items', 'data', 'results') || []
  return {
    items,
    page: pick(d, 'number', 'page') ?? page,
    totalPages: pick(d, 'totalPages') ?? 1,
    total: pick(d, 'totalElements', 'total') ?? items.length,
  }
}

export function toFacility(d) {
  if (!d) return null
  const photos = pick(d, 'photos', 'images', 'photoUrls') || []
  return {
    id: pick(d, 'id', 'facilityId'),
    ownerId: pick(d, 'ownerId'),
    name: pick(d, 'name', 'facilityName'),
    location: pick(d, 'location', 'city', 'address'),
    address: pick(d, 'address', 'location'),
    description: pick(d, 'description'),
    sportTypes: (pick(d, 'sportTypes', 'sports') || []).map(upper),
    photos: photos.map((p) => (typeof p === 'string' ? p : pick(p, 'url', 'imageUrl'))).filter(Boolean),
    status: upper(pick(d, 'status', 'approvalStatus')),
    rejectionReason: pick(d, 'rejectionReason', 'rejectReason'),
    rating: pick(d, 'rating', 'averageRating'),
    reviewCount: pick(d, 'reviewCount', 'reviewsCount'),
    startingPrice: pick(d, 'startingPrice', 'minPrice', 'pricePerHour'),
    openingTime: pick(d, 'openingTime', 'openTime'),
    closingTime: pick(d, 'closingTime', 'closeTime'),
    ownerName: pick(d, 'ownerName'),
    ownerEmail: pick(d, 'ownerEmail'),
  }
}

export function toCourt(d) {
  if (!d) return null
  return {
    id: pick(d, 'id', 'courtId'),
    facilityId: pick(d, 'facilityId'),
    name: pick(d, 'name', 'courtName'),
    sportType: upper(pick(d, 'sportType', 'sport')),
    pricePerHour: pick(d, 'pricePerHour', 'price', 'hourlyPrice'),
    status: upper(pick(d, 'status')),
    active: pick(d, 'active') ?? (upper(pick(d, 'status')) ? upper(pick(d, 'status')) === 'ACTIVE' : undefined),
  }
}

export function toSlot(d) {
  const status = upper(pick(d, 'status')) || (pick(d, 'available') === false ? 'BOOKED' : 'AVAILABLE')
  return {
    slotId: pick(d, 'slotId', 'id'),
    courtId: pick(d, 'courtId'),
    date: pick(d, 'date'),
    startTime: pick(d, 'startTime', 'start'),
    endTime: pick(d, 'endTime', 'end'),
    price: pick(d, 'price', 'amount'),
    status,
    available: STATUS.slotAvailable.includes(status),
  }
}

export function toBooking(d) {
  if (!d) return null
  const court = pick(d, 'court') || {}
  const facility = pick(d, 'facility') || pick(court, 'facility') || {}
  const slot = pick(d, 'slot', 'timeSlot') || {}
  const payment = pick(d, 'payment') || {}
  return {
    id: pick(d, 'id', 'bookingId'),
    reference: pick(d, 'reference', 'bookingReference', 'bookingCode', 'id', 'bookingId'),
    courtId: pick(d, 'courtId') ?? court.id,
    courtName: pick(d, 'courtName') ?? court.name,
    facilityId: pick(d, 'facilityId') ?? facility.id,
    facilityName: pick(d, 'facilityName') ?? facility.name,
    slotId: pick(d, 'slotId') ?? slot.id,
    date: pick(d, 'date', 'bookingDate') ?? slot.date,
    startTime: pick(d, 'startTime') ?? slot.startTime,
    endTime: pick(d, 'endTime') ?? slot.endTime,
    status: upper(pick(d, 'status', 'bookingStatus')),
    paymentStatus: upper(pick(d, 'paymentStatus') ?? payment.status),
    paymentId: pick(d, 'paymentId') ?? payment.id,
    totalAmount: pick(d, 'totalAmount', 'amount', 'price'),
    playerName: pick(d, 'userName', 'playerName'),
    playerEmail: pick(d, 'userEmail', 'playerEmail'),
    createdAt: pick(d, 'createdAt'),
  }
}

export function toPayment(d) {
  if (!d) return null
  return {
    id: pick(d, 'id', 'paymentId'),
    bookingId: pick(d, 'bookingId'),
    amount: pick(d, 'amount', 'totalAmount'),
    status: upper(pick(d, 'status', 'paymentStatus')),
    method: pick(d, 'paymentMethod', 'method'),
    transactionId: pick(d, 'transactionId', 'reference'),
    message: pick(d, 'message'),
  }
}

export function toReview(d) {
  return {
    id: pick(d, 'id', 'reviewId'),
    rating: pick(d, 'rating'),
    comment: pick(d, 'comment', 'text', 'review'),
    userName: pick(d, 'userName', 'author', 'name'),
    createdAt: pick(d, 'createdAt', 'date'),
  }
}

export const isAvailableSlot = (s) => STATUS.slotAvailable.includes(upper(s.status))
export const isCancellable = (b) => STATUS.bookingCancellable.includes(b.status)
export const bucketOf = (b) =>
  STATUS.bookingCancelled.includes(b.status)
    ? 'cancelled'
    : STATUS.bookingCompleted.includes(b.status)
      ? 'completed'
      : STATUS.bookingUpcoming.includes(b.status)
        ? 'upcoming'
        : 'other'
