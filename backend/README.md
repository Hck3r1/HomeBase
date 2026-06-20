# HomeBase API (backend)

## Setup
1. `cp .env.example .env` and fill secrets.
2. `docker compose up -d db` (PostGIS on port **5433** — avoids conflict with a local Postgres on 5432)
3. `npx prisma migrate deploy`
4. `npm run prisma:seed` (reference data for setup/catalog screens)
5. `npm run dev` → http://localhost:4000/health

## API docs (Swagger)

Interactive docs: **http://localhost:4000/api/docs**

Raw OpenAPI JSON: **http://localhost:4000/api/docs.json**

## Auth API (`/api/v1`)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/auth/register` | — | Create account; sends verification email (no tokens) |
| POST | `/auth/login` | — | Email/password login (requires verified email) |
| POST | `/auth/verify-email` | — | Verify email with token from email link |
| GET | `/auth/verify-email?token=` | — | Verify email via browser link |
| POST | `/auth/refresh` | — | Exchange refresh token for new access/refresh pair |
| POST | `/auth/logout` | — | Logout (stateless; client discards tokens) |
| POST | `/auth/forgot-password` | — | Send 6-digit OTP to email (account must exist) |
| POST | `/auth/verify-reset-otp` | — | Verify OTP; returns short-lived `resetToken` |
| POST | `/auth/reset-password` | — | Set new password with `resetToken` |
| POST | `/auth/social` | — | Google/Facebook/X token login *(mobile deferred)* |

## User & setup API (`/api/v1`)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/me` | Bearer | Current user profile, preferences, setup state |
| PATCH | `/me` | Bearer | Update name, phone, avatar, birthday, gender |
| PATCH | `/me/role` | Bearer | Set role (`seeker` \| `lister`) and lister type |
| PATCH | `/me/preferences` | Bearer | Save listing interests, budget, city, bedrooms |
| POST | `/me/setup-complete` | Bearer | Mark onboarding setup finished |
| POST | `/me/push-token` | Bearer | Register Expo push token |

## Catalog API (`/api/v1`)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/catalog/setup-options` | — | Cities, budgets, genders, listing types, defaults |

**Roles:** `seeker` (default) or `lister` with `listerType` of `agent` or `landlord`.

**Setup flow:** `setupStep` tracks progress (`profile` → `role` → `preferences` → `kyc`). `setupCompletedAt` gates access to the main app.

**Email verification:** New signups receive a verification link by email.

Configure **one** mail provider in `.env`:

1. **Resend (recommended)** — https://resend.com/api-keys
   ```
   RESEND_API_KEY=re_...
   MAIL_FROM=onboarding@resend.dev
   ```

2. **SMTP** (Gmail, etc.)
   ```
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=587
   SMTP_USER=you@gmail.com
   SMTP_PASS=your-app-password
   MAIL_FROM=you@gmail.com
   ```

Without either provider, **development** logs the verification link to the server console.

Set `API_BASE_URL` to your Mac's LAN IP (e.g. `http://192.168.0.115:4000`) so verification links work from a physical device.

## Test

```bash
npm test
```

Requires the db container running; tests use `homebase_test` on port 5433.

## Phase 1 scope

Implemented: auth, email verification, password reset (OTP), JWT refresh, user profile, role upgrade, setup preferences, catalog reference data, push-token registration.

Deferred: social login on mobile, phone OTP, push notification delivery (token endpoint only).
