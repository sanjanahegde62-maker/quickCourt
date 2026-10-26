# Backend dependencies: status

**Nothing below has been verified.** When this frontend was written, the `quickCourt-backend` folder
contained only a README (no `*Controller.java` files), so every endpoint, DTO field and enum value is
taken from the proposed contract in the spec. Mark each row after you check the real Spring Boot code.

| Area | Endpoint the frontend calls | Verified? | If missing, what breaks |
|---|---|---|---|
| Auth | `POST /auth/register`, `POST /auth/login`, `GET /users/me`, `PATCH /users/me` | No | No sign-in / session restore / profile |
| Auth (optional) | `POST /auth/otp/request`, `POST /auth/otp/verify` | No | OTP is OFF by default (`FEATURES.otp=false`) |
| Auth (optional) | `POST /auth/logout` | No | Logout only clears the local token (`FEATURES.serverLogout=false`) |
| Venues | `GET /facilities` (+ `q, sport, minPrice, maxPrice, minRating, sort, page, size`) | No | Landing + search show an error state |
| Venues | `GET /facilities/{id}`, `/courts`, `/reviews` | No | Venue page error / no courts / no reviews |
| Availability | `GET /courts/{id}`, `GET /courts/{id}/availability?date=` | No | Cannot pick a slot |
| Booking | `POST /bookings`, `GET /bookings/me`, `GET /bookings/{id}`, `POST /bookings/{id}/cancel` | No | Booking flow, My Bookings, cancel |
| Payment | `POST /payments`, `GET /payments/{id}` | No | Checkout fails; booking stays unpaid |
| Payment (optional) | a demo-methods endpoint (`ENDPOINTS.payments.methods`, null) | No | A single "Demo payment" option is shown |
| Reviews | `POST /facilities/{id}/reviews` | No | Review form shows the server's error |
| Owner | `GET/POST /owner/facilities`, `PATCH /owner/facilities/{id}` | No | Facility management |
| Owner | `GET/POST /owner/facilities/{id}/courts`, `PATCH /owner/courts/{id}` | No | Court management |
| Owner | `PUT /owner/courts/{id}/availability`, `POST /owner/courts/{id}/blocks` | No | Operating hours / blocking |
| Owner | `GET /owner/bookings`, `GET /owner/analytics` | No | Owner bookings / dashboard / analytics |
| Admin | `GET /admin/facilities?status=`, `POST .../approve`, `POST .../reject` | No | Approval queue |
| Admin | `GET /admin/users`, `PATCH /admin/users/{id}/status` | No | User management (`FEATURES.adminBan`) |
| Admin | `GET /admin/bookings`, `GET /admin/analytics` | No | Booking monitor / analytics |

## Backend behaviours the frontend relies on (must be enforced server-side)

1. **Booking creation re-validates the slot** and returns **HTTP 409** if it was taken.
2. **The booking amount is set by the server.** The UI shows the slot price for information only.
3. **Owners can only read/change their own facilities** (403/404 otherwise), and `/owner/**` and `/admin/**` are role-protected.
4. **Blocking a slot that already has a booking is rejected** (the UI expects 409).
5. **Cancellation rules** (cut-off, refunds) live on the server; its message is shown to the user.
6. **Payment status comes from the server.** The UI never marks a payment successful by itself.
7. Review eligibility ("must have played there") is checked server-side.

## Things to confirm and then edit

- Base URL / prefix: `.env` -> `VITE_API_BASE_URL`
- Paths, query-param names, status values, role names: `src/config/endpoints.js`
- Response/DTO field names: `src/services/adapters.js`
- Request body shapes (register `role`, booking `{courtId, slotId, date}`, payment `{bookingId, paymentMethod}`, court/facility payloads): `src/services/api/*.api.js`
- JWT handling: bearer token in `sessionStorage` (`src/services/api/client.js`). Switch `USE_COOKIES` if the backend sets an HttpOnly cookie, and enable CORS with credentials on Spring Boot.
- Analytics DTOs: `AnalyticsView` renders whatever numbers/series the endpoint returns. Tailor it once the shape is known.
- CORS: the Spring Boot app must allow `http://localhost:5173` and the `Authorization` header.
