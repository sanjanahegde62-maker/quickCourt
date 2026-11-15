# API mapping (frontend -> backend)

Status: **PROPOSED, UNVERIFIED.** Fill the "Actual" column after auditing the Spring Boot controllers.
Auth for everything except the public rows is `Authorization: Bearer <JWT>`.

| Operation | Proposed method + path | Auth / roles | Request | Response (adapter) | Errors the UI handles | Actual (fill in) |
|---|---|---|---|---|---|---|
| Register | `POST /auth/register` | public | `{name,email,password,role}` | any | 400 (field errors), 409 duplicate | |
| Login | `POST /auth/login` | public | `{email,password}` | `{token\|accessToken\|jwt, user?}` | 400/401 -> "Incorrect email or password" | |
| Current user | `GET /users/me` | any | - | `toUser` | 401 -> session cleared once | |
| Update profile | `PATCH /users/me` | any | `{name,phone}` (never role) | `toUser` | 400 | |
| List venues | `GET /facilities` | public | query: `q,sport,minPrice,maxPrice,minRating,sort,page,size` | Spring Page or array (`toPage`,`toFacility`) | 400, 500 | |
| Venue | `GET /facilities/{id}` | public | - | `toFacility` | 404 | |
| Venue courts | `GET /facilities/{id}/courts` | public | - | `toCourt[]` | 404 | |
| Venue reviews | `GET /facilities/{id}/reviews` | public | - | `toReview[]` | 404 | |
| Court | `GET /courts/{id}` | public | - | `toCourt` | 404 | |
| Availability | `GET /courts/{id}/availability?date=YYYY-MM-DD` | public/player | - | `toSlot[]` | 400, 404 | |
| Create booking | `POST /bookings` | player | `{courtId,slotId,date}` | `toBooking` | **409 slot taken**, 400, 401, 403 | |
| My bookings | `GET /bookings/me` | player | - | `toBooking[]` | 401 | |
| Booking | `GET /bookings/{id}` | player (own) | - | `toBooking` | 403, 404 | |
| Cancel | `POST /bookings/{id}/cancel` | player (own) | - | booking or empty | 403/409 (rule message shown) | |
| Pay (demo) | `POST /payments` | player | `{bookingId,paymentMethod}` | `toPayment` | 400, 409, failed status | |
| Payment | `GET /payments/{id}` | player | - | `toPayment` | 404 | |
| Review | `POST /facilities/{id}/reviews` | player | `{rating,comment}` | any | 400, 403 not eligible | |
| Owner facilities | `GET/POST /owner/facilities` | owner | `{name,location,description,sportTypes,openingTime,closingTime,photos}` | `toFacility` | 400, 403 | |
| Edit facility | `PATCH /owner/facilities/{id}` | owner (own) | same | `toFacility` | 403, 404 | |
| Owner courts | `GET/POST /owner/facilities/{id}/courts` | owner (own) | `{name,sportType,pricePerHour}` | `toCourt` | 400, 403 | |
| Edit/toggle court | `PATCH /owner/courts/{id}` | owner (own) | `{name?,sportType?,pricePerHour?,status?}` | `toCourt` | 403, 404 | |
| Operating hours | `PUT /owner/courts/{id}/availability` | owner (own) | `{openingTime,closingTime}` | any | 400, 409 | |
| Block slot | `POST /owner/courts/{id}/blocks` | owner (own) | `{date,startTime,endTime,reason?}` | any | **409 has booking** | |
| Owner bookings | `GET /owner/bookings` | owner | - | `toBooking[]` | 403 | |
| Owner analytics | `GET /owner/analytics` | owner | - | free-form numbers/series | 403 | |
| Admin facilities | `GET /admin/facilities?status=` | admin | - | `toFacility[]` | 403 | |
| Approve | `POST /admin/facilities/{id}/approve` | admin | - | any | 403, 409 | |
| Reject | `POST /admin/facilities/{id}/reject` | admin | `{reason}` | any | 400, 403 | |
| Admin users | `GET /admin/users` | admin | query `q,role,status` | `toUser[]` | 403 | |
| User status | `PATCH /admin/users/{id}/status` | admin | `{status}` | any | 403 | |
| Admin bookings | `GET /admin/bookings` | admin | query `q,status,date` | `toBooking[]` | 403 | |
| Admin analytics | `GET /admin/analytics` | admin | - | free-form numbers/series | 403 | |

Error handling is centralized in `src/services/api/client.js` (`normalizeError`): 401 clears the session once and
redirects via `ProtectedRoute`; 403 is shown as "no permission" and never logs the user out; 409 is handled per
screen; 429/500 get friendly messages and never expose server text or stack traces.
