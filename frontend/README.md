# QuickCourt frontend

React 19 + Vite + Tailwind CSS 4 + Axios + React Router. Talks to a Spring Boot REST API with JWT auth.

## Run

```bash
npm install
cp .env.example .env      # set VITE_API_BASE_URL to the real backend base URL
npm run dev               # http://localhost:5173
npm run build             # production build
npm test                  # unit + flow tests (Vitest)
```

The Spring Boot app must allow CORS from `http://localhost:5173` including the `Authorization` header.

## Read this first

The backend was **not available to audit** when this was written, so endpoint paths, DTO field names and enum values are
**proposed, not verified**. All of them live in three places, so adapting is a small, local job:

| File | What to change after the backend audit |
|---|---|
| `src/config/endpoints.js` | paths, query-param names, status values, role names, feature flags |
| `src/services/adapters.js` | DTO field names -> UI shape |
| `src/services/api/*.api.js` | request body shapes |

See `MISSING_ENDPOINTS.md` (what to verify) and `API_MAPPING.md` (fill in the real endpoints).
There is no mock data: if an endpoint is missing the page shows an error state with a retry button.

## Structure

```
src/
  app/            App.jsx, router.jsx (role-guarded routes)
  auth/           AuthProvider, ProtectedRoute, roleUtils
  config/         endpoints.js   <- single source of truth for the API contract
  services/       adapters.js, api/ (one Axios client + one file per area)
  hooks/          useAsync (cancels stale requests), useDebounce
  components/     common/ (Button, Form, Modal, Badge, Toast, Pagination, DataTable, feedback), layout/, venues/, booking/, dashboard/
  features/       auth, venues, bookings, reviews, owner, admin, profile
  test/           Vitest setup + tests
```

## Behaviour worth knowing

- **Booking:** availability always comes from the server; HTTP 409 on booking refreshes slots and tells the player; the confirm button is guarded against double submits; the confirmation page re-reads booking and payment from the server and shows booking status and payment status separately.
- **Payments are a demo:** no card, CVV, bank password or UPI PIN is ever collected, and success is whatever the server returns.
- **Auth:** bearer JWT in `sessionStorage` (never the password or OTP). A 401 clears the session once and routes to `/login`; the user returns to the page they wanted. 403 does not log out.
- **Roles:** the UI hides what a role can't use, but real authorization must be enforced by Spring Security.
- **Analytics pages** render whatever numeric data the endpoint returns (cards, bars, tables); nothing is hardcoded.

## Routes

`/`, `/venues`, `/venues/:facilityId`, `/about`, `/login`, `/register`, `/verify-otp` (if enabled) ·
player: `/player`, `/book/:courtId`, `/checkout/:bookingId`, `/bookings/:id/confirmation`, `/my-bookings`, `/bookings/:id`, `/profile` ·
owner: `/owner`, `/owner/facilities`, `/owner/facilities/:id`, `/owner/courts`, `/owner/availability`, `/owner/bookings`, `/owner/analytics` ·
admin: `/admin`, `/admin/facilities`, `/admin/users`, `/admin/bookings`, `/admin/reports`
