/**
 * SINGLE SOURCE OF TRUTH for backend integration.
 *
 * !! Every path, query-param name, status value and role name below is taken from the
 * !! proposed contract in the QuickCourt spec. None of it has been verified against the
 * !! Spring Boot backend yet. When the backend is audited, edit ONLY this file
 * !! (and src/services/adapters.js for response field names).
 */

export const ENDPOINTS = {
  auth: {
    register: '/auth/register',
    login: '/auth/login',
    otpRequest: '/auth/otp/request',
    otpVerify: '/auth/otp/verify',
    logout: '/auth/logout',
    me: '/users/me',
  },
  facilities: {
    list: '/facilities',
    detail: (id) => `/facilities/${id}`,
    courts: (id) => `/facilities/${id}/courts`,
    reviews: (id) => `/facilities/${id}/reviews`,
  },
  courts: {
    detail: (id) => `/courts/${id}`,
    availability: (id) => `/courts/${id}/availability`, // ?date=YYYY-MM-DD
  },
  bookings: {
    create: '/bookings',
    mine: '/bookings/me',
    detail: (id) => `/bookings/${id}`,
    cancel: (id) => `/bookings/${id}/cancel`,
  },
  payments: {
    create: '/payments',
    detail: (id) => `/payments/${id}`,
    // Set to a path (e.g. '/payments/methods') if the backend exposes demo methods.
    methods: null,
  },
  owner: {
    facilities: '/owner/facilities',
    facility: (id) => `/owner/facilities/${id}`,
    courts: (facilityId) => `/owner/facilities/${facilityId}/courts`,
    court: (id) => `/owner/courts/${id}`,
    availability: (courtId) => `/owner/courts/${courtId}/availability`,
    blocks: (courtId) => `/owner/courts/${courtId}/blocks`,
    bookings: '/owner/bookings',
    analytics: '/owner/analytics',
  },
  admin: {
    facilities: '/admin/facilities',
    approve: (id) => `/admin/facilities/${id}/approve`,
    reject: (id) => `/admin/facilities/${id}/reject`,
    users: '/admin/users',
    userStatus: (id) => `/admin/users/${id}/status`,
    bookings: '/admin/bookings',
    analytics: '/admin/analytics',
  },
}

/** Feature flags. Turn off what the backend does not implement so the UI hides it. */
export const FEATURES = {
  otp: false, // set true only if /auth/otp/* exists
  serverLogout: false, // set true if POST /auth/logout exists
  reviews: true,
  ownerBlocks: true,
  adminBan: true,
}

/** Query-param names the list endpoints expect. */
export const PARAMS = {
  page: 'page',
  size: 'size',
  search: 'q',
  sport: 'sport',
  minPrice: 'minPrice',
  maxPrice: 'maxPrice',
  minRating: 'minRating',
  sort: 'sort',
  date: 'date',
  status: 'status',
  role: 'role',
}

/** Backend role string -> frontend role. Strips a leading ROLE_ automatically. */
export const ROLE_MAP = {
  USER: 'player',
  PLAYER: 'player',
  OWNER: 'owner',
  FACILITY_OWNER: 'owner',
  ADMIN: 'admin',
}

/** Status values (UPPERCASE) the UI reacts to. Adjust to the backend's enums. */
export const STATUS = {
  slotAvailable: ['AVAILABLE', 'FREE', 'OPEN'],
  bookingCancellable: ['PENDING', 'CONFIRMED', 'BOOKED'],
  bookingUpcoming: ['PENDING', 'CONFIRMED', 'BOOKED'],
  bookingCompleted: ['COMPLETED'],
  bookingCancelled: ['CANCELLED', 'CANCELED'],
  paymentSuccess: ['SUCCESS', 'PAID', 'COMPLETED'],
  paymentPending: ['PENDING', 'PROCESSING'],
  paymentFailed: ['FAILED', 'DECLINED'],
  facilityPending: 'PENDING',
  facilityApproved: 'APPROVED',
  facilityRejected: 'REJECTED',
  userBanned: 'BANNED',
  userActive: 'ACTIVE',
}

export const SPORTS_FALLBACK = ['BADMINTON', 'TENNIS', 'FOOTBALL', 'BASKETBALL']

/** Sort values sent in the `sort` param. Guesses: confirm with the backend. */
export const SORT_OPTIONS = [
  { value: '', label: 'Relevance' },
  { value: 'price,asc', label: 'Price: low to high' },
  { value: 'price,desc', label: 'Price: high to low' },
  { value: 'rating,desc', label: 'Top rated' },
]

export const PAGE_SIZE = 9
