/**
 * Response adapters. They translate backend DTO field names into the shapes the UI uses.
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
    status: upper(pick(d, 'status')) || 'ACTIVE',
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
  const photosArr = Array.isArray(photos) ? photos : typeof photos === 'string' ? photos.split(/[\r\n,]+/) : []
  const rawSports = pick(d, 'sportTypes', 'sports')
  const sportsArr = Array.isArray(rawSports)
    ? rawSports
    : pick(d, 'sportType')
      ? String(pick(d, 'sportType')).split(',')
      : []

  const status = upper(pick(d, 'status', 'approvalStatus')) || (d?.approved === true ? 'APPROVED' : d?.approved === false ? 'PENDING' : 'PENDING')

  const rawAmenities = pick(d, 'amenities', 'amenityList') || []
  const amenitiesArr = Array.isArray(rawAmenities)
    ? rawAmenities
    : typeof rawAmenities === 'string'
      ? rawAmenities.split(',').map((s) => s.trim()).filter(Boolean)
      : []

  return {
    id: pick(d, 'id', 'facilityId', 'venueId'),
    ownerId: pick(d, 'ownerId'),
    name: pick(d, 'name', 'facilityName'),
    location: pick(d, 'location', 'city', 'address'),
    address: pick(d, 'address', 'location'),
    city: pick(d, 'city'),
    pincode: pick(d, 'pincode'),
    description: pick(d, 'description'),
    sportTypes: sportsArr.map((s) => upper(String(s).trim())).filter(Boolean),
    photos: photosArr.map((p) => (typeof p === 'string' ? p.trim() : pick(p, 'url', 'imageUrl'))).filter(Boolean),
    status,
    rejectionReason: pick(d, 'rejectionReason', 'rejectReason'),
    rating: pick(d, 'rating', 'averageRating'),
    reviewCount: pick(d, 'reviewCount', 'reviewsCount'),
    startingPrice: pick(d, 'startingPrice', 'price', 'minPrice', 'pricePerHour'),
    amenities: amenitiesArr,
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
    facilityId: pick(d, 'facilityId', 'venueId'),
    name: pick(d, 'name', 'courtName'),
    sportType: upper(pick(d, 'sportType', 'sport')),
    pricePerHour: pick(d, 'pricePerHour', 'price', 'ratePerHour', 'pricePerSlot'),
    status: upper(pick(d, 'status')) || 'ACTIVE',
  }
}

export function toSlot(d) {
  if (!d) return null
  const startTime = pick(d, 'startTime', 'start')
  const endTime = pick(d, 'endTime', 'end')
  const id = pick(d, 'id', 'slotId') || (startTime && endTime ? `${startTime}-${endTime}` : undefined)
  const st = upper(pick(d, 'status'))
  const isAvail = pick(d, 'available', 'isAvailable')
  const available = isAvail !== undefined && isAvail !== null ? isAvail === true : STATUS.slotAvailable.includes(st)
  return {
    id,
    courtId: pick(d, 'courtId'),
    startTime,
    endTime,
    duration: pick(d, 'duration') || 60,
    price: pick(d, 'price', 'rate', 'pricePerHour'),
    status: st,
    available,
    holdExpiresAt: pick(d, 'holdExpiresAt'),
  }
}

export function bucketOf(booking) {
  if (!booking) return 'other'
  const st = upper(pick(booking, 'status', 'bookingStatus'))
  if (STATUS.bookingCancelled.includes(st)) return 'cancelled'
  if (STATUS.bookingCompleted.includes(st)) return 'completed'
  if (STATUS.bookingPending.includes(st)) return 'pending'
  if (STATUS.bookingUpcoming.includes(st)) return 'upcoming'
  return 'other'
}

export function isCancellable(booking) {
  if (!booking) return false
  const st = upper(pick(booking, 'status', 'bookingStatus'))
  return STATUS.bookingCancellable.includes(st)
}

export function toBooking(d) {
  if (!d) return null
  return {
    id: pick(d, 'id', 'bookingId'),
    facilityId: pick(d, 'facilityId', 'venueId'),
    courtId: pick(d, 'courtId'),
    facilityName: pick(d, 'facilityName', 'venueName'),
    courtName: pick(d, 'courtName'),
    sportType: upper(pick(d, 'sportType', 'sport')),
    date: pick(d, 'date', 'bookingDate'),
    startTime: pick(d, 'startTime', 'start'),
    endTime: pick(d, 'endTime', 'end'),
    duration: pick(d, 'durationMinutes', 'duration') || 60,
    totalAmount: pick(d, 'totalAmount', 'totalPrice', 'amount', 'price'),
    status: upper(pick(d, 'status', 'bookingStatus')),
    paymentStatus: upper(pick(d, 'paymentStatus', 'payment_status')),
    paymentMethod: upper(pick(d, 'paymentMethod')),
    transactionId: pick(d, 'transactionId'),
    razorpayOrderId: pick(d, 'razorpayOrderId'),
    razorpayKeyId: pick(d, 'razorpayKeyId'),
    holdExpiresAt: pick(d, 'holdExpiresAt'),
    gatewayConfigured: pick(d, 'gatewayConfigured'),
    gatewayMessage: pick(d, 'gatewayMessage'),
    createdAt: pick(d, 'createdAt', 'createdDate'),
    userName: pick(d, 'userName', 'customerName'),
    userEmail: pick(d, 'userEmail', 'customerEmail'),
  }
}

export function toReview(d) {
  if (!d) return null
  return {
    id: pick(d, 'id', 'reviewId'),
    facilityId: pick(d, 'facilityId', 'venueId'),
    rating: pick(d, 'rating', 'stars'),
    comment: pick(d, 'comment', 'text', 'review'),
    author: pick(d, 'author', 'userName', 'user'),
    createdAt: pick(d, 'createdAt', 'date'),
  }
}

export function toPayment(d) {
  if (!d) return null
  return {
    id: pick(d, 'id', 'paymentId'),
    bookingId: pick(d, 'bookingId'),
    amount: pick(d, 'amount', 'totalAmount'),
    status: upper(pick(d, 'status', 'paymentStatus')) || 'SUCCESS',
    paymentMethod: upper(pick(d, 'paymentMethod', 'method')),
    transactionId: pick(d, 'transactionId', 'reference'),
    message: pick(d, 'message'),
  }
}
