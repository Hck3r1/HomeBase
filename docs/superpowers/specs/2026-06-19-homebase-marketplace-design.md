# HomeBase — Product Requirements & Design Spec

**Status:** Draft for review
**Date:** 2026-06-19
**Owner:** Moyosore (full-stack: React Native frontend + Express/Postgres backend)

---

## 1. Overview & Vision

HomeBase is a mobile-first property marketplace for the Nigerian market that unifies
**three listing types in one app**:

- **Rent** — long-term residential rentals (annual/monthly leases)
- **Buy** — property sales
- **Short-stay** — Airbnb-style nightly bookings

Agents and landlords list properties; seekers discover, message, book/apply, and pay
**in-app** via Paystack (NGN). The platform holds short-stay funds in an escrow-style
ledger and releases them to hosts after check-in. Listers verify identity through
**Dojah** before they can receive payouts.

### Product principles
- One flexible listing model with a `listing_type` discriminator; shared search, media,
  and messaging across all three types.
- Money safety first: server-computed pricing, atomic DB transactions, signed webhooks,
  escrow ledger.
- Trust: verified-agent vs. individual-landlord distinction; KYC gating on payouts.

---

## 2. Goals & Non-Goals (v1)

### Goals
- Ship a unified rent + buy + short-stay marketplace on iOS and Android (React Native/Expo).
- In-app payments (Paystack): short-stay bookings, rent deposits.
- Escrow-style hold & release to hosts for short-stay.
- Identity verification (Dojah) before payout.
- Search + filters + map, favorites, in-app chat, push notifications.
- Lister tooling: create/manage listings, availability calendar, booking/inquiry inbox,
  earnings/payouts.

### Non-Goals (deferred to later phases)
- Admin/moderation web panel and dispute resolution UI.
- Reviews & ratings.
- In-app settlement of property **sales** (sales are inquiry + inspection only in v1).
- Multi-currency / non-Nigeria markets.
- Long-term recurring rent collection automation (v1 covers deposit + manual rent payment;
  full rent scheduling is a later phase).

---

## 3. Users & Roles

| Role | Description | Capabilities |
|------|-------------|--------------|
| **Seeker** | Renter / buyer / guest | Browse, search, favorite, message, book short-stay, apply for rent, inquire on sales, schedule inspections, pay. |
| **Lister** | Property owner posting listings | All seeker capabilities + create/manage listings, manage availability, handle bookings/inquiries, receive payouts. |
| **Lister sub-type: Agent** | Professional/agency | Shown with a **Verified Agent** badge after KYC. |
| **Lister sub-type: Landlord** | Individual owner | Individual landlord label after KYC. |

A single account can be both seeker and lister (role upgraded via `PATCH /me/role`).
Payouts require completed Dojah KYC + a Paystack transfer recipient.

---

## 4. Tech Stack

### Frontend (mobile)
- **React Native via Expo** (managed workflow + dev build for native modules).
- **React Navigation** (stack + bottom tabs).
- **React Query** (server state/caching) + **Zustand** (local/UI state).
- **react-native-maps** (map view), **expo-image-picker** (photo upload),
  **Paystack React Native** (or WebView checkout), **expo-notifications** (push).
- **Socket.IO client** (chat).

### Backend
- **Node.js + Express** REST API (`/api/v1`).
- **PostgreSQL + Prisma ORM**; **PostGIS** extension for geo proximity search.
- **JWT** auth (access + refresh), bcrypt password hashing.
- **Socket.IO** for realtime chat.
- **Validation:** Zod (or Joi) on all inputs; centralized error handler.
- **Security:** Helmet, CORS, rate limiting, role middleware, signed webhook verification.

### Integrations
- **Paystack** — charges (card/bank/transfer), transfer recipients + transfers (payouts),
  webhooks.
- **Dojah** — KYC/identity verification (ID/BVN), verification status callbacks.
- **Cloudinary** — image storage + signed uploads + transformations.
- **FCM / Expo Push** — push notifications.

---

## 5. Functional Requirements

### 5.1 Onboarding & Auth
- Email/password registration & login; social login (Google, Facebook, X).
- Forgot/reset password; optional phone OTP.
- Role selection (seeker by default; upgrade to lister, choose agent/landlord).
- JWT session with refresh; persisted securely (expo-secure-store).

### 5.2 Discovery & Search
- Home feed with greeting, search bar, **Rent / Buy / Short-stay** segmented filter.
- Full-text + faceted filters: type, price range, location, bedrooms, bathrooms,
  property type, amenities; sort (price, recency, distance).
- **Map view** with clustered pins; tap pin → mini card → detail.
- Listing detail: photo gallery, full info, type-specific block, map snippet, lister card.
- Favorites/saved listings.

### 5.3 Booking / Apply / Inquire
- **Short-stay:** select date range + guests → server price quote → review →
  Paystack payment → escrow hold → confirmation. Host confirm/decline. Check-in triggers
  escrow release to host.
- **Rent:** application + security-deposit payment via Paystack; lister reviews application.
- **Sale:** inquiry message + schedule inspection (no in-app settlement).
- **Inspections/viewings:** request, confirm, reschedule; reminders via push.
- Seeker tracking: "My bookings / applications / inquiries" with status.

### 5.4 Messaging
- Conversation per (seeker, lister, listing). Realtime via Socket.IO; REST history.
- Typing indicators, read receipts, push on new message.

### 5.5 Lister Tools
- Multi-step **create listing**: type → details → photos (Cloudinary) → pricing →
  location (map pin).
- Edit/pause/activate/mark rented/sold; manage own listings.
- **Availability calendar** manager (short-stay): block/open dates, set nightly rate,
  cleaning fee, min/max nights.
- **Inbox**: incoming bookings, applications, inquiries, viewing requests.
- **Earnings/payouts**: balance, escrow held vs. released, payout history, transfer to bank.

### 5.6 Account & Trust
- Profile + edit; avatar upload.
- **KYC (Dojah):** submit ID/BVN; status (`pending` / `verified` / `rejected`); gating on payouts.
- **Payout setup:** bank details → Paystack transfer recipient.
- Notifications center; settings (push prefs, password, logout, delete account).

---

## 6. Data Model (PostgreSQL / Prisma)

> Stored as relational tables with foreign keys. Geo fields use PostGIS `geography(Point)`.
> Money stored as integer **kobo** (NGN minor unit) to avoid float errors.

### `users`
`id, name, email (unique), password_hash, role (seeker|lister), lister_type (agent|landlord|null),
phone, avatar_url, email_verified_at, created_at, updated_at`

### `auth_providers`
`id, user_id → users, provider (google|facebook|x), provider_uid, created_at`

### `kyc_verifications`
`id, user_id → users, provider (dojah), id_type, reference, status (pending|verified|rejected),
raw_response (jsonb), verified_at, created_at`

### `payout_accounts`
`id, user_id → users, bank_code, account_number, account_name,
paystack_recipient_code, is_default, created_at`

### `listings`
`id, owner_id → users, listing_type (rent|sale|shortstay), status (draft|active|paused|rented|sold),
title, description, property_type (apartment|house|duplex|land|...), bedrooms, bathrooms, area_sqm,
amenities (text[]), address, city, state, geo (geography Point), created_at, updated_at`

### `listing_photos`
`id, listing_id → listings, cloudinary_public_id, url, position, created_at`

### `listing_rent_details`
`listing_id → listings (pk/fk), monthly_rent, annual_rent, security_deposit, lease_term_months,
available_from`

### `listing_sale_details`
`listing_id → listings (pk/fk), sale_price, negotiable, title_docs_verified`

### `listing_shortstay_details`
`listing_id → listings (pk/fk), nightly_rate, cleaning_fee, min_nights, max_nights, max_guests,
house_rules`

### `availability` (short-stay)
`id, listing_id → listings, date, status (open|blocked|booked), price_override, UNIQUE(listing_id,date)`

### `favorites`
`id, user_id → users, listing_id → listings, created_at, UNIQUE(user_id,listing_id)`

### `bookings` (short-stay)
`id, listing_id, guest_id, host_id, check_in, check_out, guests, nights, subtotal, cleaning_fee,
service_fee, total, status (pending|confirmed|checked_in|completed|cancelled|declined),
payment_id → payments, created_at`

### `applications` (rent)
`id, listing_id, applicant_id, host_id, message, deposit_payment_id → payments,
status (pending|approved|rejected|withdrawn), created_at`

### `inquiries` (sale)
`id, listing_id, seeker_id, host_id, message, status (open|closed), created_at`

### `viewings` (inspections — rent & sale)
`id, listing_id, requester_id, host_id, scheduled_at, status (requested|confirmed|rescheduled|cancelled|completed),
created_at`

### `payments`
`id, payer_id, payee_id, listing_id, purpose (booking|rent_deposit|rent), amount, currency (NGN),
paystack_reference, status (initialized|paid|failed|refunded), escrow_status (none|held|released|refunded),
release_at, created_at`

### `payouts`
`id, user_id, amount, paystack_transfer_code, status (pending|success|failed), created_at`

### `conversations`
`id, listing_id, created_at` + `conversation_participants(conversation_id, user_id)`

### `messages`
`id, conversation_id, sender_id, body, attachments (jsonb), read_at, created_at`

### `notifications`
`id, user_id, type, payload (jsonb), read_at, created_at`

### `push_tokens`
`id, user_id, token, platform (ios|android), created_at`

---

## 7. Screen Inventory (~35)

### Onboarding & Auth (6)
1. **Splash** — branded teal launch.
2. **Walkthrough/Intro** — 2–3 value slides.
3. **Sign up** — name/email/password + social.
4. **Log in** — email/password + social.
5. **Forgot / Reset password**.
6. **Role select** — seeker vs lister; if lister → agent/landlord.

### Discovery & Search (6)
7. **Home feed** — greeting, search, segmented type filter, nearby listings, tabs.
8. **Search filters** — bottom sheet (type, price, location, beds, amenities).
9. **Search results (list)**.
10. **Map view** — clustered pins + mini cards.
11. **Listing detail** — gallery, info, type block, lister card, contextual CTA.
12. **Photo gallery / lightbox**.

### Booking / Apply / Inquire (7)
13. **Short-stay date & guest select** — calendar range + stepper.
14. **Booking review & pay** — price breakdown, Paystack.
15. **Booking confirmation**.
16. **Rent application + deposit pay**.
17. **Sale inquiry**.
18. **Schedule inspection** — date/time picker.
19. **My bookings / applications / inquiries** — status tracking.

### Messaging (2)
20. **Conversations list**.
21. **Chat thread**.

### Lister Tools (7)
22. **Lister dashboard** — summary + quick actions.
23. **Create listing** — multi-step (type → details → photos → pricing → location).
24. **Edit listing**.
25. **My listings**.
26. **Availability calendar manager** (short-stay).
27. **Booking / inquiry inbox**.
28. **Earnings / payouts**.

### Account & Trust (7)
29. **Profile**.
30. **Edit profile**.
31. **KYC verification (Dojah)** — ID/BVN submission + status.
32. **Payout / bank setup**.
33. **Saved / favorites**.
34. **Notifications**.
35. **Settings**.

---

## 8. API Endpoints (Express REST — `/api/v1`)

### Auth & account
- `POST /auth/register`, `POST /auth/login`, `POST /auth/social`
- `POST /auth/refresh`, `POST /auth/logout`
- `POST /auth/forgot-password`, `POST /auth/reset-password`
- `POST /auth/verify-email`, `POST /auth/otp` (optional)
- `GET /me`, `PATCH /me`, `PATCH /me/role`, `POST /me/push-token`

### KYC & payouts (lister)
- `POST /kyc` (initiate Dojah verification), `GET /kyc/status`, `POST /webhooks/dojah`
- `POST /payout-account`, `GET /payout-account`, `GET /payouts`

### Listings
- `GET /listings` (filters), `GET /listings/nearby` (lat/lng/radius → PostGIS)
- `GET /listings/:id`, `POST /listings`, `PATCH /listings/:id`, `DELETE /listings/:id`
- `PATCH /listings/:id/status`
- `POST /listings/:id/photos`, `DELETE /listings/:id/photos/:photoId`
- `GET /me/listings`

### Favorites
- `GET /favorites`, `POST /favorites/:listingId`, `DELETE /favorites/:listingId`

### Availability & bookings (short-stay)
- `GET /listings/:id/availability`, `PUT /listings/:id/availability`
- `POST /bookings/quote`, `POST /bookings`
- `GET /bookings`, `GET /bookings/:id`, `POST /bookings/:id/cancel`
- `GET /me/hosted-bookings`, `POST /bookings/:id/confirm`, `POST /bookings/:id/decline`
- `POST /bookings/:id/check-in` (release escrow)

### Rent & sale
- `POST /applications`, `GET /applications`, `GET /me/applications`
- `POST /inquiries`, `GET /inquiries`
- `POST /viewings`, `PATCH /viewings/:id`, `GET /viewings`

### Payments (Paystack)
- `POST /payments/initialize`, `GET /payments/:ref/verify`
- `POST /webhooks/paystack`
- `POST /payments/:id/refund`, `GET /payments`

### Messaging
- `GET /conversations`, `POST /conversations`
- `GET /conversations/:id/messages`, `POST /conversations/:id/messages`
- WS: `message:new`, `message:read`, `typing`

### Notifications
- `GET /notifications`, `PATCH /notifications/:id/read`, `PATCH /notifications/read-all`

### Cross-cutting middleware
`requireAuth`, `requireLister`, `requireKyc` (for payouts), rate limiting, input validation,
Paystack/Dojah webhook signature verification, ownership checks.

---

## 9. Key Flows

### 9.1 Short-stay booking + escrow
1. Guest selects dates/guests → `POST /bookings/quote` returns **server-computed** breakdown.
2. `POST /bookings` opens a DB transaction: create `booking (pending)`, mark `availability` for
   the range as `booked`, create `payment (initialized, escrow=held)`, init Paystack.
3. Guest pays via Paystack; `POST /webhooks/paystack` (signature-verified) marks `payment=paid`,
   `booking=confirmed`, notifies host.
4. On `POST /bookings/:id/check-in`, escrow flips to `released` and a Paystack **transfer** is
   sent to the host's payout account; record in `payouts`.
5. Cancellation rules refund per policy (`POST /payments/:id/refund`), free the dates.

### 9.2 Rent deposit
- `POST /applications` with deposit → Paystack payment (no escrow release loop; deposit handling
  per agreement). Lister approves/rejects; status tracked.

### 9.3 KYC via Dojah
- Lister starts verification (`POST /kyc`) → Dojah flow (ID/BVN). Result via `POST /webhooks/dojah`
  updates `kyc_verifications.status`. `requireKyc` blocks payout setup/transfers until `verified`.

### 9.4 Payments via Paystack
- All charges initialized server-side; client never sends final amounts. Webhooks are the source
  of truth for payment state. Amounts in kobo.

---

## 10. Non-Functional Requirements
- **Security:** JWT rotation, bcrypt, HTTPS only, signed webhooks, rate limiting, input validation,
  least-privilege role checks, secrets in env/secret manager.
- **Data integrity:** money in kobo (int), DB transactions for booking+payment+availability.
- **Performance:** indexed search (incl. GIN on amenities, GiST on geo), pagination on all lists,
  image CDN via Cloudinary.
- **Reliability:** idempotent webhook handling (dedupe by reference), retry-safe transfers.
- **Observability:** structured logging, error tracking (e.g. Sentry), payment audit trail.
- **Accessibility & UX:** consistent teal design system, large tap targets, loading/empty/error states.

---

## 11. Design System (from provided samples)
- **Primary:** deep teal/sea-green (~`#3B7A6F`) for splash, primary buttons, accents, checks.
- **Buttons:** fully-rounded pills — teal-filled primary, white-with-border secondary/social.
- **Inputs:** grouped in a single rounded bordered card with divider rows.
- **Surfaces:** white background; light-gray cards (`#F3F5F4`) for grouped content.
- **Selectors:** segmented toggle pills; circular radios with teal check.
- **Type:** clean sans-serif, large bold headings, muted gray subtitles, generous spacing.
- **Icons:** thin minimal line icons.

---

## 12. Future Phases (out of v1 scope)
- Admin/moderation web panel + dispute resolution.
- Reviews & ratings (listings + hosts).
- In-app sale settlement / offers / escrow for purchases.
- Recurring rent collection & reminders.
- Multi-currency / cross-border expansion.
- Saved searches + price-drop alerts.

---

## 13. Assumptions
- Single Nigeria market, NGN only, Paystack as sole payment provider for v1.
- Dojah is the sole KYC provider.
- Sales are lead-gen only (no in-app purchase settlement) in v1.
- No admin panel or reviews in v1 (explicitly deferred).
- One codebase, two roles (seeker/lister) in the same app (no separate lister app).
