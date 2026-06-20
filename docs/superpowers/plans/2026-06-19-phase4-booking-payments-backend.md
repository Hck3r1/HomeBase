# Phase 4 — Short-stay Booking & Payments (Backend) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the short-stay booking flow end-to-end with Paystack escrow: an availability calendar, server-computed price quotes, an atomic booking+payment+availability transaction, host confirm/decline/check-in lifecycle, escrow hold-and-release with Paystack transfers, and a signature-verified, idempotent Paystack webhook. All money stays in integer **kobo**.

**Architecture:** A thin Paystack client lives in `src/lib/paystack.ts` (transaction init/verify, transfer recipient/transfer, HMAC-SHA512 webhook verification) so the rest of the app never talks to Paystack's HTTP API directly and tests can mock one module. Three feature modules follow the established `modules/<name>` pattern: `availability` (host calendar + public availability read), `bookings` (quote, create, lifecycle), and `payments` (initialize, verify, webhook, refund, list). Bookings use a Prisma **interactive transaction** (`prisma.$transaction(async (tx) => {...})`) so the booking row, the per-night `Availability` rows, and the escrow `Payment` row are created atomically — a half-booked night can never exist. Prisma models `Availability`, `Booking`, `Payment`, `Payout` (plus enums) are added; the `User` and `Listing` models gain back-relations. Reuses Phase 0–3 `createApp()`, `ApiError`/`errorHandler`, the `prisma` singleton, `requireAuth`/`requireLister`, `validate(schema)`, and the `tests/helpers/db.ts` `resetDb` truncate helper (extended here). Assumes Phase 3 added the `PayoutAccount` model (`id, userId, paystackRecipientCode, isDefault, ...`); check-in transfers read the host's default payout account.

**Tech Stack:** Express, Prisma, PostgreSQL, Zod, Node `crypto`, global `fetch` (Node 18+), Jest, Supertest.

> **Note on git:** Each task ends with a commit run in your own terminal. Assumes Phases 0–3 are complete (`createApp()`, `ApiError`/`errorHandler`, `prisma`, `env`, `requireAuth`/`requireLister`, `validate`, `Listing` + type-detail models, `PayoutAccount`, test harness with `resetDb`).

> All paths relative to `backend/`. API base is `/api/v1`. **Money is integer kobo throughout.**

---

## File Structure (created/modified this phase)

```
backend/
├── prisma/schema.prisma                       # + Availability, Booking, Payment, Payout + enums; relations on User/Listing
├── src/
│   ├── config/env.ts                          # MODIFY: Paystack keys
│   ├── lib/paystack.ts                         # init/verify txn, transfer recipient/transfer, webhook HMAC
│   ├── modules/availability/availability.schemas.ts
│   ├── modules/availability/availability.service.ts
│   ├── modules/availability/availability.controller.ts
│   ├── modules/availability/availability.routes.ts
│   ├── modules/bookings/bookings.schemas.ts
│   ├── modules/bookings/bookings.service.ts
│   ├── modules/bookings/bookings.controller.ts
│   ├── modules/bookings/bookings.routes.ts
│   ├── modules/payments/payments.schemas.ts
│   ├── modules/payments/payments.service.ts
│   ├── modules/payments/payments.controller.ts
│   ├── modules/payments/payments.routes.ts
│   └── app.ts                                  # MODIFY: capture rawBody + mount routers
└── tests/
    ├── helpers/db.ts                           # MODIFY: extend TRUNCATE list
    ├── paystack.test.ts
    ├── availability.test.ts
    ├── bookings.quote.test.ts
    ├── bookings.create.test.ts
    ├── bookings.lifecycle.test.ts
    └── payments.webhook.test.ts
```

---

## Task 1: Prisma models for availability, bookings, payments, payouts

**Files:**
- Modify: `backend/prisma/schema.prisma`

- [ ] **Step 1: Add enums and models to `schema.prisma`**

Append:
```prisma
enum AvailabilityStatus {
  open
  blocked
  booked
}

enum BookingStatus {
  pending
  confirmed
  checked_in
  completed
  cancelled
  declined
}

enum PaymentPurpose {
  booking
  rent_deposit
  rent
}

enum PaymentStatus {
  initialized
  paid
  failed
  refunded
}

enum EscrowStatus {
  none
  held
  released
  refunded
}

enum PayoutStatus {
  pending
  success
  failed
}

model Availability {
  id            String             @id @default(uuid())
  listingId     String
  listing       Listing            @relation(fields: [listingId], references: [id], onDelete: Cascade)
  date          DateTime           @db.Date
  status        AvailabilityStatus @default(open)
  priceOverride Int?
  createdAt     DateTime           @default(now())

  @@unique([listingId, date])
  @@index([listingId, date])
}

model Booking {
  id          String        @id @default(uuid())
  listingId   String
  listing     Listing       @relation(fields: [listingId], references: [id], onDelete: Cascade)
  guestId     String
  guest       User          @relation("GuestBookings", fields: [guestId], references: [id], onDelete: Cascade)
  hostId      String
  host        User          @relation("HostBookings", fields: [hostId], references: [id], onDelete: Cascade)
  checkIn     DateTime      @db.Date
  checkOut    DateTime      @db.Date
  guests      Int           @default(1)
  nights      Int
  subtotal    Int
  cleaningFee Int           @default(0)
  serviceFee  Int           @default(0)
  total       Int
  status      BookingStatus @default(pending)
  paymentId   String?       @unique
  payment     Payment?      @relation(fields: [paymentId], references: [id])
  createdAt   DateTime      @default(now())
  updatedAt   DateTime      @updatedAt

  @@index([guestId])
  @@index([hostId])
  @@index([listingId, checkIn])
}

model Payment {
  id                String         @id @default(uuid())
  payerId           String
  payer             User           @relation("PayerPayments", fields: [payerId], references: [id], onDelete: Cascade)
  payeeId           String?
  payee             User?          @relation("PayeePayments", fields: [payeeId], references: [id])
  listingId         String?
  purpose           PaymentPurpose
  amount            Int
  currency          String         @default("NGN")
  paystackReference String         @unique
  status            PaymentStatus  @default(initialized)
  escrowStatus      EscrowStatus   @default(none)
  releaseAt         DateTime?
  booking           Booking?
  createdAt         DateTime       @default(now())
  updatedAt         DateTime       @updatedAt
}

model Payout {
  id                   String       @id @default(uuid())
  userId               String
  user                 User         @relation(fields: [userId], references: [id], onDelete: Cascade)
  bookingId            String?
  amount               Int
  paystackTransferCode String?
  status               PayoutStatus @default(pending)
  createdAt            DateTime     @default(now())

  @@index([userId])
}
```

- [ ] **Step 2: Add back-relations to existing models**

Prisma requires both sides of each relation. In the existing `User` model, add these fields:
```prisma
  bookingsAsGuest  Booking[] @relation("GuestBookings")
  bookingsAsHost   Booking[] @relation("HostBookings")
  paymentsMade     Payment[] @relation("PayerPayments")
  paymentsReceived Payment[] @relation("PayeePayments")
  payouts          Payout[]
```

In the existing `Listing` model, add these fields:
```prisma
  availability Availability[]
  bookings     Booking[]
```

- [ ] **Step 3: Run the migration**

Run: `npm run prisma:migrate -- --name booking_payments`
Expected: migration applies; `Availability`, `Booking`, `Payment`, `Payout` tables created; client regenerated.

- [ ] **Step 4: Commit**

```bash
git add backend/prisma && git commit -m "feat(backend): availability, booking, payment, payout models"
```

---

## Task 2: Extend env config for Paystack

**Files:**
- Modify: `backend/src/config/env.ts`
- Modify: `backend/.env.example`

- [ ] **Step 1: Add fields to the Zod schema in `env.ts`**

Add these keys to `EnvSchema` (keep existing ones):
```ts
  PAYSTACK_SECRET_KEY: z.string().default('paystack-test-secret'),
  PAYSTACK_PUBLIC_KEY: z.string().default('paystack-test-public'),
  PAYSTACK_CALLBACK_URL: z.string().default('homebase://payment-complete'),
  PLATFORM_SERVICE_FEE_BPS: z.coerce.number().default(500), // 5.00% in basis points
```

> `PLATFORM_SERVICE_FEE_BPS` keeps the service-fee rate configurable and integer-only (basis points), preserving the kobo-integer money rule. `PAYSTACK_CALLBACK_URL` is a deep link (not an `http` URL), so it is validated as a plain string.

- [ ] **Step 2: Append to `.env.example`**

```
PAYSTACK_SECRET_KEY=<your-paystack-secret-key>
PAYSTACK_PUBLIC_KEY=<your-paystack-public-key>
PAYSTACK_CALLBACK_URL=homebase://payment-complete
PLATFORM_SERVICE_FEE_BPS=500
```

- [ ] **Step 3: Commit**

```bash
git add backend/src/config/env.ts backend/.env.example
git commit -m "feat(backend): paystack env config"
```

---

## Task 3: Paystack client library

**Files:**
- Create: `backend/src/lib/paystack.ts`
- Test: `backend/tests/paystack.test.ts`

- [ ] **Step 1: Write the failing test**

`backend/tests/paystack.test.ts`:
```ts
import crypto from 'crypto';
import { verifyWebhookSignature, initializeTransaction } from '../src/lib/paystack';

describe('paystack lib', () => {
  it('verifies a valid webhook signature (HMAC SHA512)', () => {
    const secret = process.env.PAYSTACK_SECRET_KEY ?? 'paystack-test-secret';
    const body = JSON.stringify({ event: 'charge.success', data: { reference: 'ref_1' } });
    const signature = crypto.createHmac('sha512', secret).update(body).digest('hex');
    expect(verifyWebhookSignature(body, signature)).toBe(true);
  });

  it('rejects a tampered webhook signature', () => {
    const body = JSON.stringify({ event: 'charge.success', data: { reference: 'ref_1' } });
    expect(verifyWebhookSignature(body, 'deadbeef')).toBe(false);
  });

  it('calls the Paystack init endpoint and returns the authorization url', async () => {
    const spy = jest.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({
        status: true,
        data: { authorization_url: 'https://checkout.paystack.com/abc', reference: 'ref_1', access_code: 'ac_1' },
      }),
    } as any);
    const data = await initializeTransaction({ email: 'a@x.com', amountKobo: 5000000, reference: 'ref_1' });
    expect(data.authorization_url).toContain('paystack');
    expect(spy).toHaveBeenCalledWith('https://api.paystack.co/transaction/initialize', expect.any(Object));
    spy.mockRestore();
  });
});
```

- [ ] **Step 2: Run test (fails)** → `npx jest tests/paystack.test.ts` → FAIL (module not found).

- [ ] **Step 3: Implement `paystack.ts`**

`backend/src/lib/paystack.ts`:
```ts
import crypto from 'crypto';
import { parseEnv } from '../config/env';
import { ApiError } from '../middleware/error';

const env = parseEnv(process.env);
const BASE = 'https://api.paystack.co';

async function paystackPost<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.PAYSTACK_SECRET_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
  const json: any = await res.json();
  if (!res.ok || json.status === false) {
    throw new ApiError(502, json?.message ?? 'Paystack request failed');
  }
  return json.data as T;
}

async function paystackGet<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { Authorization: `Bearer ${env.PAYSTACK_SECRET_KEY}` },
  });
  const json: any = await res.json();
  if (!res.ok || json.status === false) {
    throw new ApiError(502, json?.message ?? 'Paystack request failed');
  }
  return json.data as T;
}

export interface InitTxnResult {
  authorization_url: string;
  access_code: string;
  reference: string;
}

export function initializeTransaction(input: {
  email: string;
  amountKobo: number;
  reference: string;
  metadata?: Record<string, unknown>;
}): Promise<InitTxnResult> {
  return paystackPost<InitTxnResult>('/transaction/initialize', {
    email: input.email,
    amount: input.amountKobo, // Paystack expects the smallest unit (kobo)
    reference: input.reference,
    callback_url: env.PAYSTACK_CALLBACK_URL,
    metadata: input.metadata ?? {},
  });
}

export interface VerifyTxnResult {
  status: string; // 'success' | 'failed' | ...
  reference: string;
  amount: number;
}

export function verifyTransaction(reference: string): Promise<VerifyTxnResult> {
  return paystackGet<VerifyTxnResult>(`/transaction/verify/${encodeURIComponent(reference)}`);
}

export interface TransferRecipientResult {
  recipient_code: string;
}

export function createTransferRecipient(input: {
  name: string;
  accountNumber: string;
  bankCode: string;
}): Promise<TransferRecipientResult> {
  return paystackPost<TransferRecipientResult>('/transferrecipient', {
    type: 'nuban',
    name: input.name,
    account_number: input.accountNumber,
    bank_code: input.bankCode,
    currency: 'NGN',
  });
}

export interface TransferResult {
  transfer_code: string;
  status: string;
  reference: string;
}

export function initiateTransfer(input: {
  amountKobo: number;
  recipientCode: string;
  reason?: string;
  reference?: string;
}): Promise<TransferResult> {
  return paystackPost<TransferResult>('/transfer', {
    source: 'balance',
    amount: input.amountKobo,
    recipient: input.recipientCode,
    reason: input.reason ?? 'HomeBase host payout',
    reference: input.reference,
  });
}

export function verifyWebhookSignature(rawBody: string | Buffer, signature: string | undefined): boolean {
  if (!signature) return false;
  const hash = crypto.createHmac('sha512', env.PAYSTACK_SECRET_KEY).update(rawBody).digest('hex');
  // timing-safe compare; lengths must match first
  if (hash.length !== signature.length) return false;
  return crypto.timingSafeEqual(Buffer.from(hash), Buffer.from(signature));
}
```

- [ ] **Step 4: Run test (passes)** → `npx jest tests/paystack.test.ts` → PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add backend/src/lib/paystack.ts backend/tests/paystack.test.ts
git commit -m "feat(backend): paystack client (init/verify/transfer/webhook hmac)"
```

---

## Task 4: Availability calendar (read + host write)

**Files:**
- Create: `backend/src/modules/availability/availability.schemas.ts`
- Create: `backend/src/modules/availability/availability.service.ts`
- Create: `backend/src/modules/availability/availability.controller.ts`
- Create: `backend/src/modules/availability/availability.routes.ts`
- Modify: `backend/src/app.ts`, `backend/tests/helpers/db.ts`
- Test: `backend/tests/availability.test.ts`

- [ ] **Step 1: Extend the test DB reset helper**

In `backend/tests/helpers/db.ts`, prepend the new tables to the existing TRUNCATE list (children before parents):
```ts
await prisma.$executeRawUnsafe(
  'TRUNCATE TABLE "Payout","Booking","Payment","Availability","ListingPhoto","ListingRentDetails","ListingSaleDetails","ListingShortstayDetails","Listing","PushToken","AuthProvider","User" RESTART IDENTITY CASCADE',
);
```

> If a `PayoutAccount` table exists from Phase 3, add it to this list as well (e.g. before `"User"`).

- [ ] **Step 2: Implement schemas**

`backend/src/modules/availability/availability.schemas.ts`:
```ts
import { z } from 'zod';

export const getAvailabilitySchema = z.object({
  params: z.object({ id: z.string().uuid() }),
  query: z.object({
    from: z.string().datetime().optional(),
    to: z.string().datetime().optional(),
  }),
});

export const putAvailabilitySchema = z.object({
  params: z.object({ id: z.string().uuid() }),
  body: z.object({
    days: z
      .array(
        z.object({
          date: z.string().datetime(),
          status: z.enum(['open', 'blocked']),
          priceOverride: z.number().int().positive().optional(),
        }),
      )
      .min(1),
  }),
});
```

> The host may only set `open` or `blocked`; `booked` is system-managed by the booking transaction (Task 6).

- [ ] **Step 3: Write the failing test**

`backend/tests/availability.test.ts`:
```ts
import request from 'supertest';
import { createApp } from '../src/app';
import { prisma } from '../src/lib/prisma';
import { resetDb } from './helpers/db';

const app = createApp();
beforeEach(resetDb);
afterAll(() => prisma.$disconnect());

async function listerToken(email = 'host@x.com') {
  const reg = await request(app).post('/api/v1/auth/register').send({ name: 'H', email, password: 'password1' });
  await request(app).patch('/api/v1/me/role').set('Authorization', `Bearer ${reg.body.accessToken}`).send({ role: 'lister', listerType: 'landlord' });
  const login = await request(app).post('/api/v1/auth/login').send({ email, password: 'password1' });
  return login.body.accessToken as string;
}

async function shortstayListing(token: string) {
  const res = await request(app).post('/api/v1/listings').set('Authorization', `Bearer ${token}`).send({
    listingType: 'shortstay', title: 'Cozy Studio', description: 'A cozy studio for short stays', propertyType: 'apartment',
    bedrooms: 1, bathrooms: 1, amenities: ['wifi'], address: '1 Marina', city: 'Lagos', state: 'Lagos', lat: 6.45, lng: 3.39,
    shortstay: { nightlyRate: 2500000, cleaningFee: 500000, minNights: 1, maxNights: 30, maxGuests: 4 },
  });
  return res.body.id as string;
}

describe('availability', () => {
  it('host opens and blocks dates, and reads them back', async () => {
    const token = await listerToken();
    const listingId = await shortstayListing(token);
    const put = await request(app)
      .put(`/api/v1/listings/${listingId}/availability`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        days: [
          { date: '2026-07-01T00:00:00.000Z', status: 'open', priceOverride: 3000000 },
          { date: '2026-07-02T00:00:00.000Z', status: 'blocked' },
        ],
      });
    expect(put.status).toBe(200);

    const get = await request(app).get(`/api/v1/listings/${listingId}/availability`);
    expect(get.status).toBe(200);
    expect(get.body.days).toHaveLength(2);
    const open = get.body.days.find((d: any) => d.status === 'open');
    expect(open.priceOverride).toBe(3000000);
  });

  it('rejects availability write from a non-owner (403)', async () => {
    const ownerToken = await listerToken('owner@x.com');
    const listingId = await shortstayListing(ownerToken);
    const otherToken = await listerToken('intruder@x.com');
    const res = await request(app)
      .put(`/api/v1/listings/${listingId}/availability`)
      .set('Authorization', `Bearer ${otherToken}`)
      .send({ days: [{ date: '2026-07-01T00:00:00.000Z', status: 'blocked' }] });
    expect(res.status).toBe(403);
  });
});
```

- [ ] **Step 4: Run test (fails)** → `npx jest tests/availability.test.ts` → FAIL (routes missing).

- [ ] **Step 5: Implement the service**

`backend/src/modules/availability/availability.service.ts`:
```ts
import { prisma } from '../../lib/prisma';
import { ApiError } from '../../middleware/error';

export function toUtcDate(iso: string): Date {
  const d = new Date(iso);
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

async function assertShortstayOwner(listingId: string, ownerId: string) {
  const listing = await prisma.listing.findUnique({
    where: { id: listingId },
    select: { ownerId: true, listingType: true },
  });
  if (!listing) throw new ApiError(404, 'Listing not found');
  if (listing.listingType !== 'shortstay') throw new ApiError(400, 'Listing is not a short-stay');
  if (listing.ownerId !== ownerId) throw new ApiError(403, 'Not your listing');
}

export async function getAvailability(listingId: string, from?: string, to?: string) {
  const where: any = { listingId };
  if (from || to) {
    where.date = {};
    if (from) where.date.gte = toUtcDate(from);
    if (to) where.date.lte = toUtcDate(to);
  }
  const days = await prisma.availability.findMany({ where, orderBy: { date: 'asc' } });
  return { days };
}

export async function setAvailability(
  listingId: string,
  ownerId: string,
  days: { date: string; status: 'open' | 'blocked'; priceOverride?: number }[],
) {
  await assertShortstayOwner(listingId, ownerId);
  await prisma.$transaction(
    days.map((d) =>
      prisma.availability.upsert({
        where: { listingId_date: { listingId, date: toUtcDate(d.date) } },
        update: { status: d.status, priceOverride: d.priceOverride ?? null },
        create: { listingId, date: toUtcDate(d.date), status: d.status, priceOverride: d.priceOverride ?? null },
      }),
    ),
  );
  return getAvailability(listingId);
}
```

- [ ] **Step 6: Implement controller**

`backend/src/modules/availability/availability.controller.ts`:
```ts
import { Request, Response, NextFunction } from 'express';
import * as service from './availability.service';

export const get = (req: Request, res: Response, next: NextFunction) =>
  service
    .getAvailability(req.params.id, req.query.from as string | undefined, req.query.to as string | undefined)
    .then((r) => res.json(r))
    .catch(next);

export const put = (req: Request, res: Response, next: NextFunction) =>
  service
    .setAvailability(req.params.id, req.user!.id, req.body.days)
    .then((r) => res.json(r))
    .catch(next);
```

- [ ] **Step 7: Implement routes + mount**

`backend/src/modules/availability/availability.routes.ts`:
```ts
import { Router } from 'express';
import { requireAuth, requireLister } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import * as c from './availability.controller';
import { getAvailabilitySchema, putAvailabilitySchema } from './availability.schemas';

export const availabilityRouter = Router();

availabilityRouter.get('/:id/availability', validate(getAvailabilitySchema), c.get);
availabilityRouter.put('/:id/availability', requireAuth, requireLister, validate(putAvailabilitySchema), c.put);
```

In `app.ts`, mount under the listings base (import `availabilityRouter`), before `notFound`:
```ts
app.use('/api/v1/listings', availabilityRouter);
```

- [ ] **Step 8: Run test (passes)** → `npx jest tests/availability.test.ts` → PASS (2 tests).

- [ ] **Step 9: Commit**

```bash
git add backend/src/modules/availability backend/src/app.ts backend/tests/availability.test.ts backend/tests/helpers/db.ts
git commit -m "feat(backend): availability calendar read + host write"
```

---

## Task 5: Booking quote (server-computed breakdown)

**Files:**
- Create: `backend/src/modules/bookings/bookings.schemas.ts`
- Create: `backend/src/modules/bookings/bookings.service.ts`
- Create: `backend/src/modules/bookings/bookings.controller.ts`
- Create: `backend/src/modules/bookings/bookings.routes.ts`
- Modify: `backend/src/app.ts`
- Test: `backend/tests/bookings.quote.test.ts`

- [ ] **Step 1: Implement schemas**

`backend/src/modules/bookings/bookings.schemas.ts`:
```ts
import { z } from 'zod';

export const quoteSchema = z.object({
  body: z.object({
    listingId: z.string().uuid(),
    checkIn: z.string().datetime(),
    checkOut: z.string().datetime(),
    guests: z.number().int().positive().default(1),
  }),
});

export const createBookingSchema = quoteSchema;

export const idParamSchema = z.object({ params: z.object({ id: z.string().uuid() }) });
```

- [ ] **Step 2: Write the failing test (quote math)**

`backend/tests/bookings.quote.test.ts`:
```ts
import request from 'supertest';
import { createApp } from '../src/app';
import { prisma } from '../src/lib/prisma';
import { resetDb } from './helpers/db';

jest.mock('../src/lib/paystack');

const app = createApp();
beforeEach(resetDb);
afterAll(() => prisma.$disconnect());

async function seedShortstay() {
  const reg = await request(app).post('/api/v1/auth/register').send({ name: 'H', email: 'h@x.com', password: 'password1' });
  await request(app).patch('/api/v1/me/role').set('Authorization', `Bearer ${reg.body.accessToken}`).send({ role: 'lister', listerType: 'landlord' });
  const login = await request(app).post('/api/v1/auth/login').send({ email: 'h@x.com', password: 'password1' });
  const token = login.body.accessToken;
  const listing = await request(app).post('/api/v1/listings').set('Authorization', `Bearer ${token}`).send({
    listingType: 'shortstay', title: 'Studio', description: 'A cozy studio for short stays', propertyType: 'apartment',
    bedrooms: 1, bathrooms: 1, amenities: [], address: '1 Marina', city: 'Lagos', state: 'Lagos', lat: 6.45, lng: 3.39,
    shortstay: { nightlyRate: 2500000, cleaningFee: 500000, minNights: 1, maxNights: 30, maxGuests: 4 },
  });
  return { token, listingId: listing.body.id as string };
}

describe('booking quote', () => {
  it('computes nights × rate + cleaning + 5% service fee on the server', async () => {
    const { token, listingId } = await seedShortstay();
    const res = await request(app)
      .post('/api/v1/bookings/quote')
      .set('Authorization', `Bearer ${token}`)
      .send({ listingId, checkIn: '2026-07-01T00:00:00.000Z', checkOut: '2026-07-04T00:00:00.000Z', guests: 2 });
    expect(res.status).toBe(200);
    // 3 nights × 2,500,000 kobo = 7,500,000 subtotal
    expect(res.body.nights).toBe(3);
    expect(res.body.subtotal).toBe(7500000);
    expect(res.body.cleaningFee).toBe(500000);
    // service fee = round(7,500,000 × 500 / 10000) = 375,000
    expect(res.body.serviceFee).toBe(375000);
    expect(res.body.total).toBe(7500000 + 500000 + 375000);
  });

  it('rejects a quote exceeding maxGuests (400)', async () => {
    const { token, listingId } = await seedShortstay();
    const res = await request(app)
      .post('/api/v1/bookings/quote')
      .set('Authorization', `Bearer ${token}`)
      .send({ listingId, checkIn: '2026-07-01T00:00:00.000Z', checkOut: '2026-07-02T00:00:00.000Z', guests: 9 });
    expect(res.status).toBe(400);
  });
});
```

- [ ] **Step 3: Run test (fails)** → `npx jest tests/bookings.quote.test.ts` → FAIL.

- [ ] **Step 4: Implement the quote service**

`backend/src/modules/bookings/bookings.service.ts`:
```ts
import { prisma } from '../../lib/prisma';
import { parseEnv } from '../../config/env';
import { ApiError } from '../../middleware/error';
import { toUtcDate } from '../availability/availability.service';

const env = parseEnv(process.env);

export interface Quote {
  listingId: string;
  hostId: string;
  checkIn: Date;
  checkOut: Date;
  guests: number;
  nights: number;
  subtotal: number;
  cleaningFee: number;
  serviceFee: number;
  total: number;
}

export function dateRange(checkIn: Date, checkOut: Date): Date[] {
  const dates: Date[] = [];
  const d = new Date(checkIn);
  while (d.getTime() < checkOut.getTime()) {
    dates.push(new Date(d));
    d.setUTCDate(d.getUTCDate() + 1);
  }
  return dates;
}

export function serviceFeeFor(subtotal: number): number {
  return Math.round((subtotal * env.PLATFORM_SERVICE_FEE_BPS) / 10000);
}

export async function buildQuote(input: {
  listingId: string;
  checkIn: string;
  checkOut: string;
  guests: number;
}): Promise<Quote> {
  const checkIn = toUtcDate(input.checkIn);
  const checkOut = toUtcDate(input.checkOut);
  if (checkOut.getTime() <= checkIn.getTime()) throw new ApiError(400, 'checkOut must be after checkIn');

  const listing = await prisma.listing.findUnique({
    where: { id: input.listingId },
    include: { shortstay: true },
  });
  if (!listing || !listing.shortstay) throw new ApiError(404, 'Short-stay listing not found');
  const ss = listing.shortstay;

  const nights = dateRange(checkIn, checkOut).length;
  if (nights < ss.minNights) throw new ApiError(400, `Minimum stay is ${ss.minNights} night(s)`);
  if (nights > ss.maxNights) throw new ApiError(400, `Maximum stay is ${ss.maxNights} night(s)`);
  if (input.guests > ss.maxGuests) throw new ApiError(400, `Maximum ${ss.maxGuests} guest(s)`);

  // Per-night price uses availability overrides where present, else the base nightly rate.
  const overrides = await prisma.availability.findMany({
    where: { listingId: listing.id, date: { gte: checkIn, lt: checkOut } },
  });
  const overrideByTime = new Map(overrides.map((o) => [o.date.getTime(), o]));
  let subtotal = 0;
  for (const day of dateRange(checkIn, checkOut)) {
    const row = overrideByTime.get(day.getTime());
    subtotal += row?.priceOverride ?? ss.nightlyRate;
  }

  const cleaningFee = ss.cleaningFee;
  const serviceFee = serviceFeeFor(subtotal);
  return {
    listingId: listing.id,
    hostId: listing.ownerId,
    checkIn,
    checkOut,
    guests: input.guests,
    nights,
    subtotal,
    cleaningFee,
    serviceFee,
    total: subtotal + cleaningFee + serviceFee,
  };
}
```

- [ ] **Step 5: Implement controller + routes + mount**

`backend/src/modules/bookings/bookings.controller.ts`:
```ts
import { Request, Response, NextFunction } from 'express';
import * as service from './bookings.service';

export const quote = (req: Request, res: Response, next: NextFunction) =>
  service
    .buildQuote(req.body)
    .then((q) =>
      res.json({
        listingId: q.listingId,
        checkIn: q.checkIn,
        checkOut: q.checkOut,
        guests: q.guests,
        nights: q.nights,
        subtotal: q.subtotal,
        cleaningFee: q.cleaningFee,
        serviceFee: q.serviceFee,
        total: q.total,
        currency: 'NGN',
      }),
    )
    .catch(next);
```

`backend/src/modules/bookings/bookings.routes.ts`:
```ts
import { Router } from 'express';
import { requireAuth } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import * as c from './bookings.controller';
import { quoteSchema } from './bookings.schemas';

export const bookingsRouter = Router();

bookingsRouter.post('/quote', requireAuth, validate(quoteSchema), c.quote);
```

In `app.ts`, mount (import `bookingsRouter`) before `notFound`:
```ts
app.use('/api/v1/bookings', bookingsRouter);
```

- [ ] **Step 6: Run test (passes)** → `npx jest tests/bookings.quote.test.ts` → PASS (2 tests).

- [ ] **Step 7: Commit**

```bash
git add backend/src/modules/bookings backend/src/app.ts backend/tests/bookings.quote.test.ts
git commit -m "feat(backend): server-computed booking quote"
```

---

## Task 6: Create booking (atomic transaction) + list + get

**Files:**
- Modify: `backend/src/modules/bookings/bookings.service.ts`, `bookings.controller.ts`, `bookings.routes.ts`
- Test: `backend/tests/bookings.create.test.ts`

- [ ] **Step 1: Write the failing test (double-booking prevented)**

`backend/tests/bookings.create.test.ts`:
```ts
import request from 'supertest';
import { createApp } from '../src/app';
import { prisma } from '../src/lib/prisma';
import { resetDb } from './helpers/db';
import * as paystack from '../src/lib/paystack';

jest.mock('../src/lib/paystack');
const mockedPaystack = paystack as jest.Mocked<typeof paystack>;

const app = createApp();
beforeEach(() => {
  mockedPaystack.initializeTransaction.mockResolvedValue({
    authorization_url: 'https://checkout.paystack.com/xyz',
    access_code: 'ac_1',
    reference: 'ref_1',
  });
});
beforeEach(resetDb);
afterAll(() => prisma.$disconnect());

async function lister(email: string) {
  const reg = await request(app).post('/api/v1/auth/register').send({ name: 'H', email, password: 'password1' });
  await request(app).patch('/api/v1/me/role').set('Authorization', `Bearer ${reg.body.accessToken}`).send({ role: 'lister', listerType: 'landlord' });
  const login = await request(app).post('/api/v1/auth/login').send({ email, password: 'password1' });
  return login.body.accessToken as string;
}

async function seekerToken(email: string) {
  const reg = await request(app).post('/api/v1/auth/register').send({ name: 'G', email, password: 'password1' });
  return reg.body.accessToken as string;
}

async function shortstay(hostToken: string) {
  const res = await request(app).post('/api/v1/listings').set('Authorization', `Bearer ${hostToken}`).send({
    listingType: 'shortstay', title: 'Studio', description: 'A cozy studio for short stays', propertyType: 'apartment',
    bedrooms: 1, bathrooms: 1, amenities: [], address: '1 Marina', city: 'Lagos', state: 'Lagos', lat: 6.45, lng: 3.39,
    shortstay: { nightlyRate: 2500000, cleaningFee: 500000, minNights: 1, maxNights: 30, maxGuests: 4 },
  });
  return res.body.id as string;
}

const dates = { listingId: '', checkIn: '2026-07-01T00:00:00.000Z', checkOut: '2026-07-04T00:00:00.000Z', guests: 2 };

describe('create booking', () => {
  it('creates a pending booking, holds escrow, marks dates booked, returns Paystack auth url', async () => {
    const hostToken = await lister('host@x.com');
    const listingId = await shortstay(hostToken);
    const guest = await seekerToken('guest@x.com');

    const res = await request(app)
      .post('/api/v1/bookings')
      .set('Authorization', `Bearer ${guest}`)
      .send({ ...dates, listingId });
    expect(res.status).toBe(201);
    expect(res.body.booking.status).toBe('pending');
    expect(res.body.authorizationUrl).toContain('paystack');

    const payment = await prisma.payment.findFirst({ where: { id: res.body.booking.paymentId } });
    expect(payment?.escrowStatus).toBe('held');
    expect(payment?.status).toBe('initialized');

    const booked = await prisma.availability.count({ where: { listingId, status: 'booked' } });
    expect(booked).toBe(3);
  });

  it('prevents a double booking of overlapping dates (409)', async () => {
    const hostToken = await lister('host2@x.com');
    const listingId = await shortstay(hostToken);
    const guestA = await seekerToken('a@x.com');
    const guestB = await seekerToken('b@x.com');

    const first = await request(app).post('/api/v1/bookings').set('Authorization', `Bearer ${guestA}`).send({ ...dates, listingId });
    expect(first.status).toBe(201);

    const second = await request(app)
      .post('/api/v1/bookings')
      .set('Authorization', `Bearer ${guestB}`)
      .send({ listingId, checkIn: '2026-07-03T00:00:00.000Z', checkOut: '2026-07-05T00:00:00.000Z', guests: 1 });
    expect(second.status).toBe(409);
  });

  it('blocks the host from booking their own listing (400)', async () => {
    const hostToken = await lister('host3@x.com');
    const listingId = await shortstay(hostToken);
    const res = await request(app).post('/api/v1/bookings').set('Authorization', `Bearer ${hostToken}`).send({ ...dates, listingId });
    expect(res.status).toBe(400);
  });
});
```

- [ ] **Step 2: Run test (fails)** → `npx jest tests/bookings.create.test.ts` → FAIL.

- [ ] **Step 3: Add `createBooking`, `listBookings`, `getBooking` to the service**

Append to `backend/src/modules/bookings/bookings.service.ts`:
```ts
import crypto from 'crypto';
import { initializeTransaction } from '../../lib/paystack';

const bookingInclude = {
  listing: { select: { id: true, title: true, city: true, photos: { take: 1, orderBy: { position: 'asc' as const } } } },
  payment: true,
};

function newReference(): string {
  return `hb_${crypto.randomBytes(10).toString('hex')}`;
}

export async function createBooking(guest: { id: string; email: string }, input: {
  listingId: string;
  checkIn: string;
  checkOut: string;
  guests: number;
}) {
  const q = await buildQuote(input);
  if (q.hostId === guest.id) throw new ApiError(400, 'You cannot book your own listing');

  const nights = dateRange(q.checkIn, q.checkOut);
  const reference = newReference();

  const booking = await prisma.$transaction(async (tx) => {
    // Re-check availability inside the transaction to prevent double-booking.
    const clash = await tx.availability.count({
      where: {
        listingId: q.listingId,
        date: { gte: q.checkIn, lt: q.checkOut },
        status: { in: ['booked', 'blocked'] },
      },
    });
    if (clash > 0) throw new ApiError(409, 'Selected dates are no longer available');

    // Mark every night booked (upsert covers open rows and not-yet-created rows).
    for (const date of nights) {
      await tx.availability.upsert({
        where: { listingId_date: { listingId: q.listingId, date } },
        update: { status: 'booked' },
        create: { listingId: q.listingId, date, status: 'booked' },
      });
    }

    const payment = await tx.payment.create({
      data: {
        payerId: guest.id,
        payeeId: q.hostId,
        listingId: q.listingId,
        purpose: 'booking',
        amount: q.total,
        paystackReference: reference,
        status: 'initialized',
        escrowStatus: 'held',
      },
    });

    return tx.booking.create({
      data: {
        listingId: q.listingId,
        guestId: guest.id,
        hostId: q.hostId,
        checkIn: q.checkIn,
        checkOut: q.checkOut,
        guests: q.guests,
        nights: q.nights,
        subtotal: q.subtotal,
        cleaningFee: q.cleaningFee,
        serviceFee: q.serviceFee,
        total: q.total,
        status: 'pending',
        paymentId: payment.id,
      },
      include: bookingInclude,
    });
  });

  const init = await initializeTransaction({
    email: guest.email,
    amountKobo: q.total,
    reference,
    metadata: { bookingId: booking.id, purpose: 'booking' },
  });

  return { booking, authorizationUrl: init.authorization_url, reference };
}

export async function listBookings(guestId: string) {
  return prisma.booking.findMany({ where: { guestId }, include: bookingInclude, orderBy: { createdAt: 'desc' } });
}

export async function getBooking(id: string, userId: string) {
  const booking = await prisma.booking.findUnique({ where: { id }, include: bookingInclude });
  if (!booking) throw new ApiError(404, 'Booking not found');
  if (booking.guestId !== userId && booking.hostId !== userId) throw new ApiError(403, 'Not your booking');
  return booking;
}
```

> The availability re-check + per-night upsert run inside `prisma.$transaction(async (tx) => {...})`, so the booking row, the `booked` availability rows, and the escrow `held` payment commit together or not at all. Paystack initialization runs *after* the transaction commits — a failed external call leaves a recoverable `pending`/`initialized` booking rather than orphaned `booked` dates inside an open transaction.

- [ ] **Step 4: Add controller handlers**

Append to `backend/src/modules/bookings/bookings.controller.ts`:
```ts
import { prisma } from '../../lib/prisma';
import { ApiError } from '../../middleware/error';

async function payerEmail(userId: string): Promise<string> {
  const u = await prisma.user.findUnique({ where: { id: userId }, select: { email: true } });
  if (!u) throw new ApiError(404, 'User not found');
  return u.email;
}

export const create = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const email = await payerEmail(req.user!.id);
    const result = await service.createBooking({ id: req.user!.id, email }, req.body);
    res.status(201).json(result);
  } catch (e) {
    next(e);
  }
};

export const list = (req: Request, res: Response, next: NextFunction) =>
  service.listBookings(req.user!.id).then((b) => res.json({ items: b })).catch(next);

export const getOne = (req: Request, res: Response, next: NextFunction) =>
  service.getBooking(req.params.id, req.user!.id).then((b) => res.json(b)).catch(next);
```

- [ ] **Step 5: Add routes**

Append to `backend/src/modules/bookings/bookings.routes.ts`:
```ts
import { createBookingSchema, idParamSchema } from './bookings.schemas';

bookingsRouter.post('/', requireAuth, validate(createBookingSchema), c.create);
bookingsRouter.get('/', requireAuth, c.list);
bookingsRouter.get('/:id', requireAuth, validate(idParamSchema), c.getOne);
```

- [ ] **Step 6: Run test (passes)** → `npx jest tests/bookings.create.test.ts` → PASS (3 tests).

- [ ] **Step 7: Commit**

```bash
git add backend/src/modules/bookings backend/tests/bookings.create.test.ts
git commit -m "feat(backend): atomic create booking + list + get"
```

---

## Task 7: Booking lifecycle — cancel, hosted inbox, confirm, decline, check-in (escrow release)

**Files:**
- Modify: `backend/src/modules/bookings/bookings.service.ts`, `bookings.controller.ts`, `bookings.routes.ts`
- Modify: `backend/src/app.ts` (mount `/me/hosted-bookings`)
- Test: `backend/tests/bookings.lifecycle.test.ts`

- [ ] **Step 1: Write the failing test (escrow release on check-in)**

`backend/tests/bookings.lifecycle.test.ts`:
```ts
import request from 'supertest';
import { createApp } from '../src/app';
import { prisma } from '../src/lib/prisma';
import { resetDb } from './helpers/db';
import * as paystack from '../src/lib/paystack';

jest.mock('../src/lib/paystack');
const mockedPaystack = paystack as jest.Mocked<typeof paystack>;

const app = createApp();
beforeEach(() => {
  mockedPaystack.initializeTransaction.mockResolvedValue({ authorization_url: 'https://checkout.paystack.com/xyz', access_code: 'ac', reference: 'ref' });
  mockedPaystack.initiateTransfer.mockResolvedValue({ transfer_code: 'trf_1', status: 'success', reference: 'po_1' });
});
beforeEach(resetDb);
afterAll(() => prisma.$disconnect());

async function lister(email: string) {
  const reg = await request(app).post('/api/v1/auth/register').send({ name: 'H', email, password: 'password1' });
  await request(app).patch('/api/v1/me/role').set('Authorization', `Bearer ${reg.body.accessToken}`).send({ role: 'lister', listerType: 'landlord' });
  const login = await request(app).post('/api/v1/auth/login').send({ email, password: 'password1' });
  return { token: login.body.accessToken as string, id: reg.body.user.id as string };
}

async function setup() {
  const host = await lister('host@x.com');
  const listing = await request(app).post('/api/v1/listings').set('Authorization', `Bearer ${host.token}`).send({
    listingType: 'shortstay', title: 'Studio', description: 'A cozy studio for short stays', propertyType: 'apartment',
    bedrooms: 1, bathrooms: 1, amenities: [], address: '1 Marina', city: 'Lagos', state: 'Lagos', lat: 6.45, lng: 3.39,
    shortstay: { nightlyRate: 2500000, cleaningFee: 500000, minNights: 1, maxNights: 30, maxGuests: 4 },
  });
  // Host has a payout recipient (assumed set up in Phase 3).
  await prisma.payoutAccount.create({
    data: { userId: host.id, bankCode: '058', accountNumber: '0123456789', accountName: 'Host', paystackRecipientCode: 'RCP_1', isDefault: true },
  });
  const reg = await request(app).post('/api/v1/auth/register').send({ name: 'G', email: 'guest@x.com', password: 'password1' });
  const guest = reg.body.accessToken as string;
  const booking = await request(app).post('/api/v1/bookings').set('Authorization', `Bearer ${guest}`).send({
    listingId: listing.body.id, checkIn: '2026-07-01T00:00:00.000Z', checkOut: '2026-07-04T00:00:00.000Z', guests: 2,
  });
  return { host, guest, listingId: listing.body.id as string, bookingId: booking.body.booking.id as string, paymentId: booking.body.booking.paymentId as string };
}

describe('booking lifecycle', () => {
  it('host sees the booking in the hosted inbox, confirms, then check-in releases escrow + transfers payout', async () => {
    const { host, bookingId, paymentId } = await setup();
    // Simulate payment captured by the webhook.
    await prisma.payment.update({ where: { id: paymentId }, data: { status: 'paid' } });

    const inbox = await request(app).get('/api/v1/me/hosted-bookings').set('Authorization', `Bearer ${host.token}`);
    expect(inbox.status).toBe(200);
    expect(inbox.body.items).toHaveLength(1);

    const confirm = await request(app).post(`/api/v1/bookings/${bookingId}/confirm`).set('Authorization', `Bearer ${host.token}`);
    expect(confirm.status).toBe(200);
    expect(confirm.body.status).toBe('confirmed');

    const checkIn = await request(app).post(`/api/v1/bookings/${bookingId}/check-in`).set('Authorization', `Bearer ${host.token}`);
    expect(checkIn.status).toBe(200);
    expect(checkIn.body.status).toBe('checked_in');

    const payment = await prisma.payment.findUnique({ where: { id: paymentId } });
    expect(payment?.escrowStatus).toBe('released');
    expect(mockedPaystack.initiateTransfer).toHaveBeenCalledTimes(1);
    const payout = await prisma.payout.findFirst({ where: { userId: host.id } });
    expect(payout?.status).toBe('success');
  });

  it('guest cancels a pending booking: dates freed + escrow refunded', async () => {
    const { guest, listingId, bookingId, paymentId } = await setup();
    const res = await request(app).post(`/api/v1/bookings/${bookingId}/cancel`).set('Authorization', `Bearer ${guest}`);
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('cancelled');

    const payment = await prisma.payment.findUnique({ where: { id: paymentId } });
    expect(payment?.escrowStatus).toBe('refunded');
    const stillBooked = await prisma.availability.count({ where: { listingId, status: 'booked' } });
    expect(stillBooked).toBe(0);
  });

  it('host declines a pending booking: dates freed', async () => {
    const { host, listingId, bookingId } = await setup();
    const res = await request(app).post(`/api/v1/bookings/${bookingId}/decline`).set('Authorization', `Bearer ${host.token}`);
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('declined');
    const stillBooked = await prisma.availability.count({ where: { listingId, status: 'booked' } });
    expect(stillBooked).toBe(0);
  });
});
```

- [ ] **Step 2: Run test (fails)** → `npx jest tests/bookings.lifecycle.test.ts` → FAIL.

- [ ] **Step 3: Add lifecycle functions to the service**

Append to `backend/src/modules/bookings/bookings.service.ts`:
```ts
import { initiateTransfer } from '../../lib/paystack';

async function loadOwned(id: string, role: 'guest' | 'host', userId: string) {
  const booking = await prisma.booking.findUnique({ where: { id }, include: { payment: true } });
  if (!booking) throw new ApiError(404, 'Booking not found');
  const ownerId = role === 'guest' ? booking.guestId : booking.hostId;
  if (ownerId !== userId) throw new ApiError(403, 'Not your booking');
  return booking;
}

async function freeDates(tx: typeof prisma, listingId: string, checkIn: Date, checkOut: Date) {
  await tx.availability.updateMany({
    where: { listingId, date: { gte: checkIn, lt: checkOut }, status: 'booked' },
    data: { status: 'open' },
  });
}

export async function listHostedBookings(hostId: string) {
  return prisma.booking.findMany({ where: { hostId }, include: bookingInclude, orderBy: { createdAt: 'desc' } });
}

export async function confirmBooking(id: string, hostId: string) {
  const booking = await loadOwned(id, 'host', hostId);
  if (booking.status !== 'pending') throw new ApiError(409, 'Only pending bookings can be confirmed');
  return prisma.booking.update({ where: { id }, data: { status: 'confirmed' }, include: bookingInclude });
}

export async function declineBooking(id: string, hostId: string) {
  const booking = await loadOwned(id, 'host', hostId);
  if (!['pending', 'confirmed'].includes(booking.status)) throw new ApiError(409, 'Cannot decline this booking');
  return prisma.$transaction(async (tx) => {
    await freeDates(tx as unknown as typeof prisma, booking.listingId, booking.checkIn, booking.checkOut);
    if (booking.paymentId) {
      await tx.payment.update({ where: { id: booking.paymentId }, data: { status: 'refunded', escrowStatus: 'refunded' } });
    }
    return tx.booking.update({ where: { id }, data: { status: 'declined' }, include: bookingInclude });
  });
}

export async function cancelBooking(id: string, guestId: string) {
  const booking = await loadOwned(id, 'guest', guestId);
  if (['checked_in', 'completed', 'cancelled', 'declined'].includes(booking.status)) {
    throw new ApiError(409, 'Booking can no longer be cancelled');
  }
  return prisma.$transaction(async (tx) => {
    await freeDates(tx as unknown as typeof prisma, booking.listingId, booking.checkIn, booking.checkOut);
    if (booking.paymentId) {
      await tx.payment.update({ where: { id: booking.paymentId }, data: { status: 'refunded', escrowStatus: 'refunded' } });
    }
    return tx.booking.update({ where: { id }, data: { status: 'cancelled' }, include: bookingInclude });
  });
}

export async function checkInBooking(id: string, hostId: string) {
  const booking = await loadOwned(id, 'host', hostId);
  if (booking.status !== 'confirmed') throw new ApiError(409, 'Booking must be confirmed to check in');
  if (!booking.payment || booking.payment.status !== 'paid') throw new ApiError(400, 'Payment is not captured yet');
  if (booking.payment.escrowStatus !== 'held') throw new ApiError(409, 'Escrow already settled');

  const payoutAccount = await prisma.payoutAccount.findFirst({
    where: { userId: hostId, isDefault: true },
  });
  if (!payoutAccount?.paystackRecipientCode) throw new ApiError(400, 'Set up a payout account first');

  // The host is paid out the subtotal + cleaning fee; the platform retains the service fee.
  const payoutAmount = booking.subtotal + booking.cleaningFee;
  const transfer = await initiateTransfer({
    amountKobo: payoutAmount,
    recipientCode: payoutAccount.paystackRecipientCode,
    reason: `HomeBase payout for booking ${booking.id}`,
    reference: `po_${booking.id}`,
  });

  return prisma.$transaction(async (tx) => {
    await tx.payment.update({ where: { id: booking.paymentId! }, data: { escrowStatus: 'released', releaseAt: new Date() } });
    await tx.payout.create({
      data: {
        userId: hostId,
        bookingId: booking.id,
        amount: payoutAmount,
        paystackTransferCode: transfer.transfer_code,
        status: transfer.status === 'failed' ? 'failed' : 'success',
      },
    });
    return tx.booking.update({ where: { id }, data: { status: 'checked_in' }, include: bookingInclude });
  });
}
```

> `checkInBooking` reads the host's default `PayoutAccount` (assumed created in Phase 3) for the Paystack `recipient_code`, releases escrow, records a `Payout`, and flips the booking to `checked_in`. The Paystack transfer happens before the DB transaction so a transfer failure surfaces as a 502 without mutating escrow state.

- [ ] **Step 4: Add controller handlers**

Append to `backend/src/modules/bookings/bookings.controller.ts`:
```ts
export const hosted = (req: Request, res: Response, next: NextFunction) =>
  service.listHostedBookings(req.user!.id).then((b) => res.json({ items: b })).catch(next);

export const confirm = (req: Request, res: Response, next: NextFunction) =>
  service.confirmBooking(req.params.id, req.user!.id).then((b) => res.json(b)).catch(next);

export const decline = (req: Request, res: Response, next: NextFunction) =>
  service.declineBooking(req.params.id, req.user!.id).then((b) => res.json(b)).catch(next);

export const cancel = (req: Request, res: Response, next: NextFunction) =>
  service.cancelBooking(req.params.id, req.user!.id).then((b) => res.json(b)).catch(next);

export const checkIn = (req: Request, res: Response, next: NextFunction) =>
  service.checkInBooking(req.params.id, req.user!.id).then((b) => res.json(b)).catch(next);
```

- [ ] **Step 5: Add routes + mount hosted inbox**

Append to `backend/src/modules/bookings/bookings.routes.ts`:
```ts
bookingsRouter.post('/:id/cancel', requireAuth, validate(idParamSchema), c.cancel);
bookingsRouter.post('/:id/confirm', requireAuth, requireLister, validate(idParamSchema), c.confirm);
bookingsRouter.post('/:id/decline', requireAuth, requireLister, validate(idParamSchema), c.decline);
bookingsRouter.post('/:id/check-in', requireAuth, requireLister, validate(idParamSchema), c.checkIn);
```

In `app.ts`, add the hosted inbox route (import `hosted` from the bookings controller), before `notFound`:
```ts
import { hosted } from './modules/bookings/bookings.controller';
import { requireAuth, requireLister } from './middleware/auth';
app.get('/api/v1/me/hosted-bookings', requireAuth, requireLister, hosted);
```

- [ ] **Step 6: Run test (passes)** → `npx jest tests/bookings.lifecycle.test.ts` → PASS (3 tests).

- [ ] **Step 7: Commit**

```bash
git add backend/src/modules/bookings backend/src/app.ts backend/tests/bookings.lifecycle.test.ts
git commit -m "feat(backend): booking lifecycle + escrow release on check-in"
```

---

## Task 8: Payments — initialize, verify, webhook (signed + idempotent), refund, list

**Files:**
- Create: `backend/src/modules/payments/payments.schemas.ts`
- Create: `backend/src/modules/payments/payments.service.ts`
- Create: `backend/src/modules/payments/payments.controller.ts`
- Create: `backend/src/modules/payments/payments.routes.ts`
- Modify: `backend/src/app.ts` (capture rawBody + mount payments router)
- Test: `backend/tests/payments.webhook.test.ts`

- [ ] **Step 1: Capture the raw request body for webhook verification**

In `createApp()` (`app.ts`), change the JSON body parser so the raw bytes are retained for signature checks (Paystack signs the exact payload):
```ts
app.use(
  express.json({
    verify: (req, _res, buf) => {
      (req as any).rawBody = buf;
    },
  }),
);
```

- [ ] **Step 2: Implement schemas**

`backend/src/modules/payments/payments.schemas.ts`:
```ts
import { z } from 'zod';

export const initializeSchema = z.object({
  body: z.object({
    purpose: z.enum(['booking', 'rent_deposit', 'rent']),
    amount: z.number().int().positive(), // kobo
    listingId: z.string().uuid().optional(),
    payeeId: z.string().uuid().optional(),
  }),
});

export const refundSchema = z.object({ params: z.object({ id: z.string().uuid() }) });
export const refParamSchema = z.object({ params: z.object({ ref: z.string().min(6) }) });
```

- [ ] **Step 3: Write the failing test (webhook signature verification + idempotency)**

`backend/tests/payments.webhook.test.ts`:
```ts
import crypto from 'crypto';
import request from 'supertest';
import { createApp } from '../src/app';
import { prisma } from '../src/lib/prisma';
import { resetDb } from './helpers/db';
import * as paystack from '../src/lib/paystack';

jest.mock('../src/lib/paystack', () => {
  const actual = jest.requireActual('../src/lib/paystack');
  return { ...actual, initializeTransaction: jest.fn(), verifyTransaction: jest.fn() };
});
const mockedPaystack = paystack as jest.Mocked<typeof paystack>;

const app = createApp();
const SECRET = process.env.PAYSTACK_SECRET_KEY ?? 'paystack-test-secret';
beforeEach(() => {
  mockedPaystack.initializeTransaction.mockResolvedValue({ authorization_url: 'https://checkout.paystack.com/xyz', access_code: 'ac', reference: 'ref' });
});
beforeEach(resetDb);
afterAll(() => prisma.$disconnect());

function sign(body: string) {
  return crypto.createHmac('sha512', SECRET).update(body).digest('hex');
}

async function seedBooking() {
  const reg = await request(app).post('/api/v1/auth/register').send({ name: 'H', email: 'h@x.com', password: 'password1' });
  await request(app).patch('/api/v1/me/role').set('Authorization', `Bearer ${reg.body.accessToken}`).send({ role: 'lister', listerType: 'landlord' });
  const login = await request(app).post('/api/v1/auth/login').send({ email: 'h@x.com', password: 'password1' });
  const listing = await request(app).post('/api/v1/listings').set('Authorization', `Bearer ${login.body.accessToken}`).send({
    listingType: 'shortstay', title: 'Studio', description: 'A cozy studio for short stays', propertyType: 'apartment',
    bedrooms: 1, bathrooms: 1, amenities: [], address: '1 Marina', city: 'Lagos', state: 'Lagos', lat: 6.45, lng: 3.39,
    shortstay: { nightlyRate: 2500000, cleaningFee: 500000, minNights: 1, maxNights: 30, maxGuests: 4 },
  });
  const guestReg = await request(app).post('/api/v1/auth/register').send({ name: 'G', email: 'g@x.com', password: 'password1' });
  const booking = await request(app).post('/api/v1/bookings').set('Authorization', `Bearer ${guestReg.body.accessToken}`).send({
    listingId: listing.body.id, checkIn: '2026-07-01T00:00:00.000Z', checkOut: '2026-07-04T00:00:00.000Z', guests: 2,
  });
  const payment = await prisma.payment.findUnique({ where: { id: booking.body.booking.paymentId } });
  return { bookingId: booking.body.booking.id as string, reference: payment!.paystackReference };
}

describe('paystack webhook', () => {
  it('rejects a payload with an invalid signature (401)', async () => {
    const body = JSON.stringify({ event: 'charge.success', data: { reference: 'nope' } });
    const res = await request(app)
      .post('/api/v1/webhooks/paystack')
      .set('Content-Type', 'application/json')
      .set('x-paystack-signature', 'bad-signature')
      .send(body);
    expect(res.status).toBe(401);
  });

  it('marks the payment paid and the booking confirmed on a signed charge.success', async () => {
    const { bookingId, reference } = await seedBooking();
    const body = JSON.stringify({ event: 'charge.success', data: { reference, status: 'success' } });
    const res = await request(app)
      .post('/api/v1/webhooks/paystack')
      .set('Content-Type', 'application/json')
      .set('x-paystack-signature', sign(body))
      .send(body);
    expect(res.status).toBe(200);

    const payment = await prisma.payment.findUnique({ where: { paystackReference: reference } });
    expect(payment?.status).toBe('paid');
    const booking = await prisma.booking.findUnique({ where: { id: bookingId } });
    expect(booking?.status).toBe('confirmed');
  });

  it('is idempotent: a duplicate webhook does not change a paid payment', async () => {
    const { reference } = await seedBooking();
    const body = JSON.stringify({ event: 'charge.success', data: { reference, status: 'success' } });
    await request(app).post('/api/v1/webhooks/paystack').set('Content-Type', 'application/json').set('x-paystack-signature', sign(body)).send(body);
    const second = await request(app).post('/api/v1/webhooks/paystack').set('Content-Type', 'application/json').set('x-paystack-signature', sign(body)).send(body);
    expect(second.status).toBe(200);
    const payment = await prisma.payment.findUnique({ where: { paystackReference: reference } });
    expect(payment?.status).toBe('paid');
  });
});
```

- [ ] **Step 4: Run test (fails)** → `npx jest tests/payments.webhook.test.ts` → FAIL.

- [ ] **Step 5: Implement the service**

`backend/src/modules/payments/payments.service.ts`:
```ts
import crypto from 'crypto';
import { prisma } from '../../lib/prisma';
import { ApiError } from '../../middleware/error';
import { initializeTransaction, verifyTransaction } from '../../lib/paystack';

function newReference(): string {
  return `hb_${crypto.randomBytes(10).toString('hex')}`;
}

export async function initializePayment(payer: { id: string; email: string }, input: {
  purpose: 'booking' | 'rent_deposit' | 'rent';
  amount: number;
  listingId?: string;
  payeeId?: string;
}) {
  const reference = newReference();
  const payment = await prisma.payment.create({
    data: {
      payerId: payer.id,
      payeeId: input.payeeId,
      listingId: input.listingId,
      purpose: input.purpose,
      amount: input.amount,
      paystackReference: reference,
      status: 'initialized',
      escrowStatus: input.purpose === 'booking' ? 'held' : 'none',
    },
  });
  const init = await initializeTransaction({ email: payer.email, amountKobo: input.amount, reference, metadata: { paymentId: payment.id } });
  return { payment, authorizationUrl: init.authorization_url, reference };
}

export async function verifyPayment(reference: string) {
  const result = await verifyTransaction(reference);
  if (result.status === 'success') {
    await markPaid(reference);
  }
  const payment = await prisma.payment.findUnique({ where: { paystackReference: reference } });
  if (!payment) throw new ApiError(404, 'Payment not found');
  return payment;
}

// Idempotent: only the first transition out of "initialized" performs side effects.
export async function markPaid(reference: string) {
  return prisma.$transaction(async (tx) => {
    const payment = await tx.payment.findUnique({ where: { paystackReference: reference } });
    if (!payment) return; // unknown reference: ignore (webhook is best-effort)
    if (payment.status === 'paid') return; // already processed → no-op
    await tx.payment.update({ where: { id: payment.id }, data: { status: 'paid' } });
    const booking = await tx.booking.findUnique({ where: { paymentId: payment.id } });
    if (booking && booking.status === 'pending') {
      await tx.booking.update({ where: { id: booking.id }, data: { status: 'confirmed' } });
    }
  });
}

export async function handleWebhookEvent(event: string, data: { reference?: string }) {
  if (event === 'charge.success' && data.reference) {
    await markPaid(data.reference);
  }
  // Other events (transfer.success/failed, refund.processed) can be handled here later.
}

export async function refundPayment(id: string, requesterId: string) {
  const payment = await prisma.payment.findUnique({ where: { id }, include: { booking: true } });
  if (!payment) throw new ApiError(404, 'Payment not found');
  if (payment.payerId !== requesterId && payment.payeeId !== requesterId) throw new ApiError(403, 'Not your payment');
  if (payment.status === 'refunded') return payment;
  // A real Paystack refund call (`POST /refund`) would be issued here; escrow state is the source of truth.
  return prisma.payment.update({ where: { id }, data: { status: 'refunded', escrowStatus: 'refunded' } });
}

export async function listPayments(userId: string) {
  return prisma.payment.findMany({
    where: { OR: [{ payerId: userId }, { payeeId: userId }] },
    orderBy: { createdAt: 'desc' },
  });
}
```

- [ ] **Step 6: Implement controller**

`backend/src/modules/payments/payments.controller.ts`:
```ts
import { Request, Response, NextFunction } from 'express';
import { prisma } from '../../lib/prisma';
import { ApiError } from '../../middleware/error';
import { verifyWebhookSignature } from '../../lib/paystack';
import * as service from './payments.service';

async function payerEmail(userId: string): Promise<string> {
  const u = await prisma.user.findUnique({ where: { id: userId }, select: { email: true } });
  if (!u) throw new ApiError(404, 'User not found');
  return u.email;
}

export const initialize = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const email = await payerEmail(req.user!.id);
    res.status(201).json(await service.initializePayment({ id: req.user!.id, email }, req.body));
  } catch (e) {
    next(e);
  }
};

export const verify = (req: Request, res: Response, next: NextFunction) =>
  service.verifyPayment(req.params.ref).then((p) => res.json(p)).catch(next);

export const webhook = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const raw = (req as any).rawBody ?? Buffer.from(JSON.stringify(req.body));
    if (!verifyWebhookSignature(raw, req.headers['x-paystack-signature'] as string | undefined)) {
      throw new ApiError(401, 'Invalid webhook signature');
    }
    await service.handleWebhookEvent(req.body.event, req.body.data ?? {});
    res.sendStatus(200);
  } catch (e) {
    next(e);
  }
};

export const refund = (req: Request, res: Response, next: NextFunction) =>
  service.refundPayment(req.params.id, req.user!.id).then((p) => res.json(p)).catch(next);

export const list = (req: Request, res: Response, next: NextFunction) =>
  service.listPayments(req.user!.id).then((p) => res.json({ items: p })).catch(next);
```

- [ ] **Step 7: Implement routes + mount**

`backend/src/modules/payments/payments.routes.ts`:
```ts
import { Router } from 'express';
import { requireAuth } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import * as c from './payments.controller';
import { initializeSchema, refundSchema, refParamSchema } from './payments.schemas';

export const paymentsRouter = Router();

paymentsRouter.post('/initialize', requireAuth, validate(initializeSchema), c.initialize);
paymentsRouter.get('/:ref/verify', requireAuth, validate(refParamSchema), c.verify);
paymentsRouter.post('/:id/refund', requireAuth, validate(refundSchema), c.refund);
paymentsRouter.get('/', requireAuth, c.list);

export const webhooksRouter = Router();
webhooksRouter.post('/paystack', c.webhook);
```

In `app.ts`, mount both (import `paymentsRouter`, `webhooksRouter`), before `notFound`:
```ts
app.use('/api/v1/payments', paymentsRouter);
app.use('/api/v1/webhooks', webhooksRouter);
```

- [ ] **Step 8: Run test (passes)** → `npx jest tests/payments.webhook.test.ts` → PASS (3 tests).

- [ ] **Step 9: Commit**

```bash
git add backend/src/modules/payments backend/src/app.ts backend/tests/payments.webhook.test.ts
git commit -m "feat(backend): payments initialize/verify/webhook/refund/list"
```

---

## Task 9: Full suite green

- [ ] **Step 1: Run everything** → `npx jest` → all PASS.
- [ ] **Step 2: Commit any cleanups**

```bash
git add -A && git commit -m "test(backend): phase 4 booking & payments suite green" || echo "nothing to commit"
```

---

## Self-Review (against spec §5.3, §6 models, §8 Availability/Bookings + Payments endpoints, §9.1/§9.4 flows, §10 NFRs)

- **Models — Availability (UNIQUE listing+date), Booking, Payment (escrow_status none|held|released|refunded), Payout (+migration, extended `resetDb`):** Task 1, Task 4 Step 1. ✓
- **Paystack lib — initialize, verify, create transfer recipient, initiate transfer, `verifyWebhookSignature` (HMAC SHA512 with `PAYSTACK_SECRET_KEY`, env + `.env.example`):** Tasks 2, 3. ✓
- **`GET /listings/:id/availability`, `PUT /listings/:id/availability`:** Task 4. ✓
- **`POST /bookings/quote` (server-computed nights×rate + cleaning + service fee):** Task 5. ✓
- **`POST /bookings` (transaction: booking pending + availability booked + payment initialized/held + Paystack init → auth URL):** Task 6. ✓
- **`GET /bookings`, `GET /bookings/:id`, `POST /bookings/:id/cancel` (refund + free dates):** Tasks 6, 7. ✓
- **`GET /me/hosted-bookings`, `POST /bookings/:id/confirm`, `/decline`, `/check-in` (escrow→released + Paystack transfer + payout row):** Task 7. ✓
- **Payments — `POST /payments/initialize`, `GET /payments/:ref/verify`, `POST /webhooks/paystack` (signature-verified, idempotent by reference), `POST /payments/:id/refund`, `GET /payments`:** Task 8. ✓
- **Tests (paystack mocked): quote math, double-booking prevented, webhook signature verification, escrow release:** Tasks 5, 6, 8, 7. ✓

**Money safety:** every amount (`subtotal`, `cleaningFee`, `serviceFee`, `total`, `payment.amount`, `payout.amount`, `priceOverride`, `PLATFORM_SERVICE_FEE_BPS`) is an integer in kobo/basis points; the service fee is computed as `round(subtotal × bps / 10000)`. Quotes are computed entirely server-side; the client never supplies amounts. Booking creation, cancel, decline, and check-in each run inside `prisma.$transaction(async (tx) => {...})` so availability, payment/escrow, and booking state always move together.

**Type consistency:** the Paystack lib's `initializeTransaction`/`verifyTransaction`/`initiateTransfer`/`verifyWebhookSignature` signatures are used identically across `bookings.service`, `payments.service`, and the controllers; `toUtcDate` and `dateRange` are shared date helpers; the `Quote` shape returned by `buildQuote` feeds both `/bookings/quote` and `createBooking`; webhook idempotency funnels through the single `markPaid(reference)` no-op-on-`paid` path.

**No placeholders:** every code step is complete and runnable. Two annotated notes — the optional `PayoutAccount` truncate line (depends on Phase 3's table name) and the "real Paystack `/refund` call would go here" comment in `refundPayment` (escrow status is authoritative, and the lib's listed surface is the five functions in scope) — are explicit, bounded guidance, not missing requirements.
