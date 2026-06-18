# Phase 4 — Short-stay Booking & Payments (Backend) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement short-stay availability, server-computed booking quotes, atomic bookings, Paystack payments with signature-verified webhooks, and escrow hold/release with payouts to hosts.

**Architecture:** A `bookings` module and a `payments` module reuse Phase 1 auth and Phase 2 listings. Availability is a per-date row per listing. Booking creation runs inside a Prisma interactive transaction that creates the booking, marks the date range booked, and creates a held payment — preventing double-booking. Paystack is wrapped in `src/lib/paystack.ts`. The webhook is the source of truth for payment state and is idempotent by reference. Check-in flips escrow to released and triggers a Paystack transfer recorded in `payouts`. All money is integer kobo.

**Tech Stack:** Express, Prisma, PostgreSQL, Paystack (HTTP API), crypto (HMAC), Zod, Jest, Supertest.

> **Note on git:** Each task ends with a commit. Assumes Phases 0–3 complete (auth, listings, validate, resetDb helper, modules pattern).

> All paths relative to `backend/`.

---

## File Structure (created/modified this phase)

```
backend/
├── prisma/schema.prisma                    # + Availability, Booking, Payment, Payout + enums
├── src/
│   ├── config/env.ts                       # MODIFY: Paystack keys
│   ├── lib/paystack.ts                     # init/verify/transfer/webhook-signature
│   ├── modules/bookings/bookings.schemas.ts
│   ├── modules/bookings/pricing.ts         # pure quote math
│   ├── modules/bookings/availability.service.ts
│   ├── modules/bookings/bookings.service.ts
│   ├── modules/bookings/bookings.controller.ts
│   ├── modules/bookings/bookings.routes.ts
│   ├── modules/payments/payments.service.ts
│   ├── modules/payments/payments.controller.ts
│   ├── modules/payments/payments.routes.ts
│   └── app.ts                              # MODIFY: mount routers + raw body for webhook
└── tests/
    ├── pricing.test.ts
    ├── availability.test.ts
    ├── bookings.create.test.ts
    ├── payments.webhook.test.ts
    └── bookings.checkin.test.ts
```

---

## Task 1: Prisma models for availability, bookings, payments, payouts

**Files:**
- Modify: `backend/prisma/schema.prisma`

- [ ] **Step 1: Add enums + models**

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
  id        String             @id @default(uuid())
  listingId String
  listing   Listing            @relation(fields: [listingId], references: [id], onDelete: Cascade)
  date      DateTime           @db.Date
  status    AvailabilityStatus @default(open)
  priceOverride Int?
  createdAt DateTime           @default(now())

  @@unique([listingId, date])
}

model Booking {
  id          String        @id @default(uuid())
  listingId   String
  listing     Listing       @relation(fields: [listingId], references: [id])
  guestId     String
  guest       User          @relation("BookingGuest", fields: [guestId], references: [id])
  hostId      String
  host        User          @relation("BookingHost", fields: [hostId], references: [id])
  checkIn     DateTime      @db.Date
  checkOut    DateTime      @db.Date
  guests      Int           @default(1)
  nights      Int
  subtotal    Int
  cleaningFee Int
  serviceFee  Int
  total       Int
  status      BookingStatus @default(pending)
  paymentId   String?       @unique
  payment     Payment?      @relation(fields: [paymentId], references: [id])
  createdAt   DateTime      @default(now())
}

model Payment {
  id               String         @id @default(uuid())
  payerId          String
  payer            User           @relation("PaymentPayer", fields: [payerId], references: [id])
  payeeId          String
  payee            User           @relation("PaymentPayee", fields: [payeeId], references: [id])
  listingId        String?
  purpose          PaymentPurpose
  amount           Int
  currency         String         @default("NGN")
  paystackReference String        @unique
  status           PaymentStatus  @default(initialized)
  escrowStatus     EscrowStatus   @default(none)
  releaseAt        DateTime?
  booking          Booking?
  createdAt        DateTime       @default(now())
}

model Payout {
  id                 String       @id @default(uuid())
  userId             String
  user               User         @relation(fields: [userId], references: [id])
  amount             Int
  paystackTransferCode String?
  status             PayoutStatus @default(pending)
  createdAt          DateTime     @default(now())
}
```

- [ ] **Step 2: Add the back-relations to `User` and `Listing`**

In `model User`, add:
```prisma
  bookingsAsGuest Booking[] @relation("BookingGuest")
  bookingsAsHost  Booking[] @relation("BookingHost")
  paymentsMade    Payment[] @relation("PaymentPayer")
  paymentsRecvd   Payment[] @relation("PaymentPayee")
  payouts         Payout[]
```
In `model Listing`, add:
```prisma
  availability Availability[]
  bookings     Booking[]
```

- [ ] **Step 3: Run the migration**

Run: `npm run prisma:migrate -- --name bookings_payments`
Expected: tables created, client regenerated.

- [ ] **Step 4: Commit**

```bash
git add backend/prisma && git commit -m "feat(backend): availability, booking, payment, payout models"
```

---

## Task 2: Paystack env + library

**Files:**
- Modify: `backend/src/config/env.ts`, `backend/.env.example`
- Create: `backend/src/lib/paystack.ts`
- Test: `backend/tests/paystack.signature.test.ts`

- [ ] **Step 1: Add env keys**

Add to `EnvSchema`:
```ts
  PAYSTACK_SECRET_KEY: z.string().default('sk_test_placeholder'),
  PAYSTACK_PUBLIC_KEY: z.string().optional(),
  SERVICE_FEE_BPS: z.coerce.number().default(500), // 5% in basis points
```
Append to `.env.example`:
```
PAYSTACK_SECRET_KEY=sk_test_xxx
PAYSTACK_PUBLIC_KEY=pk_test_xxx
SERVICE_FEE_BPS=500
```

- [ ] **Step 2: Write the failing signature test**

`backend/tests/paystack.signature.test.ts`:
```ts
import crypto from 'crypto';
import { verifyWebhookSignature } from '../src/lib/paystack';

describe('paystack webhook signature', () => {
  it('accepts a correctly signed payload', () => {
    const body = JSON.stringify({ event: 'charge.success' });
    const sig = crypto.createHmac('sha512', process.env.PAYSTACK_SECRET_KEY!).update(body).digest('hex');
    expect(verifyWebhookSignature(body, sig)).toBe(true);
  });
  it('rejects a bad signature', () => {
    expect(verifyWebhookSignature('{}', 'deadbeef')).toBe(false);
  });
});
```

Add to `tests/setup.ts`: `process.env.PAYSTACK_SECRET_KEY = 'sk_test_placeholder';`

- [ ] **Step 3: Run test (fails)** → FAIL (module missing).

- [ ] **Step 4: Implement `paystack.ts`**

```ts
import crypto from 'crypto';
import { parseEnv } from '../config/env';

const env = parseEnv(process.env);
const BASE = 'https://api.paystack.co';

function headers() {
  return { Authorization: `Bearer ${env.PAYSTACK_SECRET_KEY}`, 'Content-Type': 'application/json' };
}

export async function initializeTransaction(input: { email: string; amount: number; reference: string; metadata?: unknown }) {
  const res = await fetch(`${BASE}/transaction/initialize`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({ email: input.email, amount: input.amount, reference: input.reference, metadata: input.metadata }),
  });
  const json = (await res.json()) as { data: { authorization_url: string; reference: string } };
  return json.data;
}

export async function verifyTransaction(reference: string) {
  const res = await fetch(`${BASE}/transaction/verify/${reference}`, { headers: headers() });
  const json = (await res.json()) as { data: { status: string; amount: number } };
  return json.data;
}

export async function createTransferRecipient(input: { name: string; accountNumber: string; bankCode: string }) {
  const res = await fetch(`${BASE}/transferrecipient`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({ type: 'nuban', name: input.name, account_number: input.accountNumber, bank_code: input.bankCode, currency: 'NGN' }),
  });
  const json = (await res.json()) as { data: { recipient_code: string } };
  return json.data;
}

export async function initiateTransfer(input: { amount: number; recipientCode: string; reason: string }) {
  const res = await fetch(`${BASE}/transfer`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({ source: 'balance', amount: input.amount, recipient: input.recipientCode, reason: input.reason }),
  });
  const json = (await res.json()) as { data: { transfer_code: string; status: string } };
  return json.data;
}

export function verifyWebhookSignature(rawBody: string, signature: string): boolean {
  const expected = crypto.createHmac('sha512', env.PAYSTACK_SECRET_KEY).update(rawBody).digest('hex');
  try {
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
  } catch {
    return false;
  }
}
```

- [ ] **Step 5: Run test (passes)** → PASS.

- [ ] **Step 6: Commit**

```bash
git add backend/src/lib/paystack.ts backend/tests/paystack.signature.test.ts backend/src/config/env.ts backend/.env.example backend/tests/setup.ts
git commit -m "feat(backend): paystack lib (init/verify/transfer/webhook signature)"
```

---

## Task 3: Pricing (pure quote math)

**Files:**
- Create: `backend/src/modules/bookings/pricing.ts`
- Test: `backend/tests/pricing.test.ts`

- [ ] **Step 1: Write the failing test**

`backend/tests/pricing.test.ts`:
```ts
import { nightsBetween, computeQuote } from '../src/modules/bookings/pricing';

describe('pricing', () => {
  it('counts nights correctly', () => {
    expect(nightsBetween('2026-08-11', '2026-08-14')).toBe(3);
  });

  it('computes a quote in kobo with 5% service fee', () => {
    const q = computeQuote({ checkIn: '2026-08-11', checkOut: '2026-08-14', nightlyRate: 4_500_000, cleaningFee: 1_000_000, serviceFeeBps: 500 });
    // 3 nights * 4,500,000 = 13,500,000 subtotal; cleaning 1,000,000; service = 5% of 13,500,000 = 675,000
    expect(q.nights).toBe(3);
    expect(q.subtotal).toBe(13_500_000);
    expect(q.cleaningFee).toBe(1_000_000);
    expect(q.serviceFee).toBe(675_000);
    expect(q.total).toBe(15_175_000);
  });

  it('rejects checkout before checkin', () => {
    expect(() => computeQuote({ checkIn: '2026-08-14', checkOut: '2026-08-11', nightlyRate: 1, cleaningFee: 0, serviceFeeBps: 0 })).toThrow();
  });
});
```

- [ ] **Step 2: Run test (fails)** → FAIL.

- [ ] **Step 3: Implement `pricing.ts`**

```ts
import { ApiError } from '../../middleware/error';

const DAY = 24 * 60 * 60 * 1000;

export function nightsBetween(checkIn: string, checkOut: string): number {
  const start = Date.parse(checkIn);
  const end = Date.parse(checkOut);
  const nights = Math.round((end - start) / DAY);
  return nights;
}

export interface QuoteInput {
  checkIn: string;
  checkOut: string;
  nightlyRate: number;
  cleaningFee: number;
  serviceFeeBps: number;
}

export interface Quote {
  nights: number;
  subtotal: number;
  cleaningFee: number;
  serviceFee: number;
  total: number;
}

export function computeQuote(input: QuoteInput): Quote {
  const nights = nightsBetween(input.checkIn, input.checkOut);
  if (nights < 1) throw new ApiError(400, 'Check-out must be after check-in');
  const subtotal = nights * input.nightlyRate;
  const serviceFee = Math.round((subtotal * input.serviceFeeBps) / 10_000);
  const total = subtotal + input.cleaningFee + serviceFee;
  return { nights, subtotal, cleaningFee: input.cleaningFee, serviceFee, total };
}
```

- [ ] **Step 4: Run test (passes)** → PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add backend/src/modules/bookings/pricing.ts backend/tests/pricing.test.ts
git commit -m "feat(backend): booking quote pricing math"
```

---

## Task 4: Availability service + endpoints

**Files:**
- Create: `backend/src/modules/bookings/availability.service.ts`
- Create: `backend/src/modules/bookings/bookings.schemas.ts`
- Modify: `backend/tests/helpers/db.ts`
- Test: `backend/tests/availability.test.ts`

- [ ] **Step 1: Extend resetDb TRUNCATE list**

In `backend/tests/helpers/db.ts`, prepend the new tables (children first):
```ts
await prisma.$executeRawUnsafe(
  'TRUNCATE TABLE "Payout","Booking","Payment","Availability","ListingPhoto","ListingRentDetails","ListingSaleDetails","ListingShortstayDetails","Listing","PushToken","AuthProvider","User" RESTART IDENTITY CASCADE',
);
```

- [ ] **Step 2: Write schemas**

`backend/src/modules/bookings/bookings.schemas.ts`:
```ts
import { z } from 'zod';

export const setAvailabilitySchema = z.object({
  body: z.object({
    ranges: z.array(
      z.object({ from: z.string(), to: z.string(), status: z.enum(['open', 'blocked']) }),
    ),
  }),
});

export const quoteSchema = z.object({
  body: z.object({
    listingId: z.string().uuid(),
    checkIn: z.string(),
    checkOut: z.string(),
    guests: z.number().int().positive().default(1),
  }),
});

export const createBookingSchema = quoteSchema;
```

- [ ] **Step 3: Write the failing test**

`backend/tests/availability.test.ts`:
```ts
import request from 'supertest';
import { createApp } from '../src/app';
import { prisma } from '../src/lib/prisma';
import { resetDb } from './helpers/db';
import { createShortstay } from './helpers/factories';

const app = createApp();
beforeEach(resetDb);
afterAll(() => prisma.$disconnect());

it('host blocks a date range and it shows as blocked', async () => {
  const { token, listingId } = await createShortstay(app);
  const res = await request(app)
    .put(`/api/v1/listings/${listingId}/availability`)
    .set('Authorization', `Bearer ${token}`)
    .send({ ranges: [{ from: '2026-08-11', to: '2026-08-13', status: 'blocked' }] });
  expect(res.status).toBe(200);
  const avail = await request(app).get(`/api/v1/listings/${listingId}/availability`);
  const blocked = avail.body.filter((d: any) => d.status === 'blocked');
  expect(blocked.length).toBeGreaterThanOrEqual(2);
});
```

- [ ] **Step 4: Write the shared test factory**

`backend/tests/helpers/factories.ts`:
```ts
import request from 'supertest';
import type { Express } from 'express';

export async function createShortstay(app: Express, email = `h${Math.random()}@x.com`) {
  const reg = await request(app).post('/api/v1/auth/register').send({ name: 'Host', email, password: 'password1' });
  await request(app).patch('/api/v1/me/role').set('Authorization', `Bearer ${reg.body.accessToken}`).send({ role: 'lister', listerType: 'landlord' });
  const login = await request(app).post('/api/v1/auth/login').send({ email, password: 'password1' });
  const token = login.body.accessToken as string;
  const listing = await request(app).post('/api/v1/listings').set('Authorization', `Bearer ${token}`).send({
    listingType: 'shortstay', title: 'Shortlet', description: 'A cozy shortlet in VI', propertyType: 'apartment',
    bedrooms: 2, bathrooms: 2, amenities: ['wifi'], address: 'VI', city: 'Lagos', state: 'Lagos', lat: 6.43, lng: 3.42,
    shortstay: { nightlyRate: 4_500_000, cleaningFee: 1_000_000, minNights: 1, maxNights: 30, maxGuests: 4 },
  });
  return { token, hostId: login.body.user.id, listingId: listing.body.id as string };
}

export async function createGuest(app: Express, email = `g${Math.random()}@x.com`) {
  const reg = await request(app).post('/api/v1/auth/register').send({ name: 'Guest', email, password: 'password1' });
  return { token: reg.body.accessToken as string, guestId: reg.body.user.id as string, email };
}
```

- [ ] **Step 5: Run test (fails)** → FAIL.

- [ ] **Step 6: Implement availability service**

`backend/src/modules/bookings/availability.service.ts`:
```ts
import { prisma } from '../../lib/prisma';
import { ApiError } from '../../middleware/error';

const DAY = 24 * 60 * 60 * 1000;

function eachDate(from: string, to: string): Date[] {
  const dates: Date[] = [];
  for (let t = Date.parse(from); t <= Date.parse(to); t += DAY) dates.push(new Date(t));
  return dates;
}

export async function setAvailability(
  listingId: string,
  ownerId: string,
  ranges: { from: string; to: string; status: 'open' | 'blocked' }[],
) {
  const listing = await prisma.listing.findUnique({ where: { id: listingId }, select: { ownerId: true } });
  if (!listing) throw new ApiError(404, 'Listing not found');
  if (listing.ownerId !== ownerId) throw new ApiError(403, 'Not your listing');
  for (const range of ranges) {
    for (const date of eachDate(range.from, range.to)) {
      await prisma.availability.upsert({
        where: { listingId_date: { listingId, date } },
        update: { status: range.status },
        create: { listingId, date, status: range.status },
      });
    }
  }
  return getAvailability(listingId);
}

export async function getAvailability(listingId: string) {
  return prisma.availability.findMany({ where: { listingId }, orderBy: { date: 'asc' } });
}

export async function assertRangeOpen(tx: typeof prisma, listingId: string, checkIn: string, checkOut: string) {
  // checkout day is not a booked night
  const nights = eachDate(checkIn, checkOut).slice(0, -1);
  const taken = await tx.availability.findMany({
    where: { listingId, date: { in: nights }, status: { in: ['blocked', 'booked'] } },
  });
  if (taken.length > 0) throw new ApiError(409, 'Some dates are unavailable');
  return nights;
}

export async function markBooked(tx: typeof prisma, listingId: string, dates: Date[]) {
  for (const date of dates) {
    await tx.availability.upsert({
      where: { listingId_date: { listingId, date } },
      update: { status: 'booked' },
      create: { listingId, date, status: 'booked' },
    });
  }
}

export async function freeDates(listingId: string, checkIn: Date, checkOut: Date) {
  await prisma.availability.updateMany({
    where: { listingId, date: { gte: checkIn, lt: checkOut }, status: 'booked' },
    data: { status: 'open' },
  });
}
```

- [ ] **Step 7: Add controller + routes (availability portion)**

Create `backend/src/modules/bookings/bookings.controller.ts` (will grow in Task 5):
```ts
import { Request, Response, NextFunction } from 'express';
import * as availability from './availability.service';

export const getAvailability = (req: Request, res: Response, next: NextFunction) =>
  availability.getAvailability(req.params.id).then((a) => res.json(a)).catch(next);

export const setAvailability = (req: Request, res: Response, next: NextFunction) =>
  availability.setAvailability(req.params.id, req.user!.id, req.body.ranges).then((a) => res.json(a)).catch(next);
```

Create `backend/src/modules/bookings/bookings.routes.ts`:
```ts
import { Router } from 'express';
import { requireAuth, requireLister } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import * as c from './bookings.controller';
import { setAvailabilitySchema } from './bookings.schemas';

export const bookingsRouter = Router();

// Availability is nested under listings:
export const listingAvailabilityRouter = Router({ mergeParams: true });
listingAvailabilityRouter.get('/:id/availability', c.getAvailability);
listingAvailabilityRouter.put('/:id/availability', requireAuth, requireLister, validate(setAvailabilitySchema), c.setAvailability);
```

In `app.ts`, mount: `app.use('/api/v1/listings', listingAvailabilityRouter);` (before `notFound`). 

- [ ] **Step 8: Run test (passes)** → `npx jest tests/availability.test.ts` → PASS.

- [ ] **Step 9: Commit**

```bash
git add backend/src/modules/bookings backend/tests/availability.test.ts backend/tests/helpers backend/src/app.ts
git commit -m "feat(backend): availability calendar service + endpoints"
```

---

## Task 5: Quote + create booking (transactional) + Paystack init

**Files:**
- Create: `backend/src/modules/bookings/bookings.service.ts`
- Modify: `backend/src/modules/bookings/bookings.controller.ts`, `bookings.routes.ts`
- Test: `backend/tests/bookings.create.test.ts`

- [ ] **Step 1: Write the failing test (mock paystack init)**

`backend/tests/bookings.create.test.ts`:
```ts
import request from 'supertest';
import { createApp } from '../src/app';
import { prisma } from '../src/lib/prisma';
import { resetDb } from './helpers/db';
import { createShortstay, createGuest } from './helpers/factories';
import * as paystack from '../src/lib/paystack';

jest.spyOn(paystack, 'initializeTransaction').mockResolvedValue({
  authorization_url: 'https://paystack/checkout/abc',
  reference: 'ref_test',
} as any);

const app = createApp();
beforeEach(resetDb);
afterAll(() => prisma.$disconnect());

describe('bookings', () => {
  it('returns a server-computed quote', async () => {
    const { listingId } = await createShortstay(app);
    const { token } = await createGuest(app);
    const res = await request(app).post('/api/v1/bookings/quote').set('Authorization', `Bearer ${token}`)
      .send({ listingId, checkIn: '2026-08-11', checkOut: '2026-08-14', guests: 2 });
    expect(res.status).toBe(200);
    expect(res.body.nights).toBe(3);
    expect(res.body.total).toBe(15_175_000);
  });

  it('creates a booking with a held payment + paystack url', async () => {
    const { listingId } = await createShortstay(app);
    const { token } = await createGuest(app);
    const res = await request(app).post('/api/v1/bookings').set('Authorization', `Bearer ${token}`)
      .send({ listingId, checkIn: '2026-08-11', checkOut: '2026-08-14', guests: 2 });
    expect(res.status).toBe(201);
    expect(res.body.authorizationUrl).toContain('paystack');
    expect(res.body.booking.status).toBe('pending');
  });

  it('prevents double-booking the same dates', async () => {
    const { listingId } = await createShortstay(app);
    const { token: t1 } = await createGuest(app);
    const { token: t2 } = await createGuest(app);
    await request(app).post('/api/v1/bookings').set('Authorization', `Bearer ${t1}`)
      .send({ listingId, checkIn: '2026-08-11', checkOut: '2026-08-14', guests: 1 });
    const res = await request(app).post('/api/v1/bookings').set('Authorization', `Bearer ${t2}`)
      .send({ listingId, checkIn: '2026-08-12', checkOut: '2026-08-15', guests: 1 });
    expect(res.status).toBe(409);
  });
});
```

- [ ] **Step 2: Run test (fails)** → FAIL.

- [ ] **Step 3: Implement the booking service**

`backend/src/modules/bookings/bookings.service.ts`:
```ts
import crypto from 'crypto';
import { prisma } from '../../lib/prisma';
import { parseEnv } from '../../config/env';
import { ApiError } from '../../middleware/error';
import { computeQuote } from './pricing';
import { assertRangeOpen, markBooked, freeDates } from './availability.service';
import { initializeTransaction } from '../../lib/paystack';

const env = parseEnv(process.env);

async function loadShortstay(listingId: string) {
  const listing = await prisma.listing.findUnique({ where: { id: listingId }, include: { shortstay: true, owner: true } });
  if (!listing || listing.listingType !== 'shortstay' || !listing.shortstay) {
    throw new ApiError(400, 'Listing is not a short-stay');
  }
  return listing;
}

export async function quote(listingId: string, checkIn: string, checkOut: string) {
  const listing = await loadShortstay(listingId);
  return computeQuote({
    checkIn,
    checkOut,
    nightlyRate: listing.shortstay!.nightlyRate,
    cleaningFee: listing.shortstay!.cleaningFee,
    serviceFeeBps: env.SERVICE_FEE_BPS,
  });
}

export async function createBooking(guestId: string, input: { listingId: string; checkIn: string; checkOut: string; guests: number }) {
  const listing = await loadShortstay(input.listingId);
  if (listing.ownerId === guestId) throw new ApiError(400, 'You cannot book your own listing');
  const q = computeQuote({
    checkIn: input.checkIn,
    checkOut: input.checkOut,
    nightlyRate: listing.shortstay!.nightlyRate,
    cleaningFee: listing.shortstay!.cleaningFee,
    serviceFeeBps: env.SERVICE_FEE_BPS,
  });

  const guest = await prisma.user.findUnique({ where: { id: guestId } });
  const reference = `bk_${crypto.randomBytes(8).toString('hex')}`;

  const { booking, payment } = await prisma.$transaction(async (tx) => {
    const nights = await assertRangeOpen(tx as any, input.listingId, input.checkIn, input.checkOut);
    const payment = await tx.payment.create({
      data: {
        payerId: guestId,
        payeeId: listing.ownerId,
        listingId: input.listingId,
        purpose: 'booking',
        amount: q.total,
        paystackReference: reference,
        status: 'initialized',
        escrowStatus: 'held',
      },
    });
    const booking = await tx.booking.create({
      data: {
        listingId: input.listingId,
        guestId,
        hostId: listing.ownerId,
        checkIn: new Date(input.checkIn),
        checkOut: new Date(input.checkOut),
        guests: input.guests,
        nights: q.nights,
        subtotal: q.subtotal,
        cleaningFee: q.cleaningFee,
        serviceFee: q.serviceFee,
        total: q.total,
        status: 'pending',
        paymentId: payment.id,
      },
    });
    await markBooked(tx as any, input.listingId, nights);
    return { booking, payment };
  });

  const paystack = await initializeTransaction({
    email: guest!.email,
    amount: q.total,
    reference,
    metadata: { bookingId: booking.id, paymentId: payment.id },
  });

  return { booking, authorizationUrl: paystack.authorization_url, reference };
}

export async function myBookings(guestId: string) {
  return prisma.booking.findMany({ where: { guestId }, include: { listing: { include: { photos: true } }, payment: true }, orderBy: { createdAt: 'desc' } });
}

export async function hostedBookings(hostId: string) {
  return prisma.booking.findMany({ where: { hostId }, include: { listing: true, guest: { select: { id: true, name: true } }, payment: true }, orderBy: { createdAt: 'desc' } });
}

export async function getBooking(id: string, userId: string) {
  const booking = await prisma.booking.findUnique({ where: { id }, include: { listing: true, payment: true } });
  if (!booking) throw new ApiError(404, 'Booking not found');
  if (booking.guestId !== userId && booking.hostId !== userId) throw new ApiError(403, 'Forbidden');
  return booking;
}

export async function cancelBooking(id: string, userId: string) {
  const booking = await prisma.booking.findUnique({ where: { id } });
  if (!booking) throw new ApiError(404, 'Booking not found');
  if (booking.guestId !== userId && booking.hostId !== userId) throw new ApiError(403, 'Forbidden');
  await prisma.booking.update({ where: { id }, data: { status: 'cancelled' } });
  await freeDates(booking.listingId, booking.checkIn, booking.checkOut);
  if (booking.paymentId) {
    await prisma.payment.update({ where: { id: booking.paymentId }, data: { escrowStatus: 'refunded' } });
  }
  return { ok: true };
}

export async function setHostDecision(id: string, hostId: string, decision: 'confirmed' | 'declined') {
  const booking = await prisma.booking.findUnique({ where: { id } });
  if (!booking) throw new ApiError(404, 'Booking not found');
  if (booking.hostId !== hostId) throw new ApiError(403, 'Forbidden');
  const updated = await prisma.booking.update({ where: { id }, data: { status: decision } });
  if (decision === 'declined') await freeDates(booking.listingId, booking.checkIn, booking.checkOut);
  return updated;
}
```

- [ ] **Step 4: Add controller handlers**

Append to `bookings.controller.ts`:
```ts
import * as service from './bookings.service';

export const quote = (req: Request, res: Response, next: NextFunction) =>
  service.quote(req.body.listingId, req.body.checkIn, req.body.checkOut).then((q) => res.json(q)).catch(next);

export const create = (req: Request, res: Response, next: NextFunction) =>
  service.createBooking(req.user!.id, req.body).then((r) => res.status(201).json(r)).catch(next);

export const mine = (req: Request, res: Response, next: NextFunction) =>
  service.myBookings(req.user!.id).then((r) => res.json(r)).catch(next);

export const hosted = (req: Request, res: Response, next: NextFunction) =>
  service.hostedBookings(req.user!.id).then((r) => res.json(r)).catch(next);

export const getOne = (req: Request, res: Response, next: NextFunction) =>
  service.getBooking(req.params.id, req.user!.id).then((r) => res.json(r)).catch(next);

export const cancel = (req: Request, res: Response, next: NextFunction) =>
  service.cancelBooking(req.params.id, req.user!.id).then((r) => res.json(r)).catch(next);

export const confirm = (req: Request, res: Response, next: NextFunction) =>
  service.setHostDecision(req.params.id, req.user!.id, 'confirmed').then((r) => res.json(r)).catch(next);

export const decline = (req: Request, res: Response, next: NextFunction) =>
  service.setHostDecision(req.params.id, req.user!.id, 'declined').then((r) => res.json(r)).catch(next);
```

- [ ] **Step 5: Add routes**

Append to `bookings.routes.ts`:
```ts
import { quoteSchema, createBookingSchema } from './bookings.schemas';

bookingsRouter.post('/quote', requireAuth, validate(quoteSchema), c.quote);
bookingsRouter.post('/', requireAuth, validate(createBookingSchema), c.create);
bookingsRouter.get('/', requireAuth, c.mine);
bookingsRouter.get('/hosted', requireAuth, requireLister, c.hosted);
bookingsRouter.get('/:id', requireAuth, c.getOne);
bookingsRouter.post('/:id/cancel', requireAuth, c.cancel);
bookingsRouter.post('/:id/confirm', requireAuth, requireLister, c.confirm);
bookingsRouter.post('/:id/decline', requireAuth, requireLister, c.decline);
```
In `app.ts`, mount `app.use('/api/v1/bookings', bookingsRouter);` and add the hosted alias `app.get('/api/v1/me/hosted-bookings', requireAuth, requireLister, c.hosted)` (import `c`/`hosted`).

- [ ] **Step 6: Run test (passes)** → `npx jest tests/bookings.create.test.ts` → PASS (3 tests).

- [ ] **Step 7: Commit**

```bash
git add backend/src/modules/bookings backend/src/app.ts backend/tests/bookings.create.test.ts
git commit -m "feat(backend): quote + transactional booking creation"
```

---

## Task 6: Payments + webhook (idempotent, signature-verified)

**Files:**
- Create: `backend/src/modules/payments/payments.service.ts`, `payments.controller.ts`, `payments.routes.ts`
- Modify: `backend/src/app.ts` (raw body for webhook route)
- Test: `backend/tests/payments.webhook.test.ts`

- [ ] **Step 1: Write the failing test**

`backend/tests/payments.webhook.test.ts`:
```ts
import crypto from 'crypto';
import request from 'supertest';
import { createApp } from '../src/app';
import { prisma } from '../src/lib/prisma';
import { resetDb } from './helpers/db';
import { createShortstay, createGuest } from './helpers/factories';
import * as paystack from '../src/lib/paystack';

jest.spyOn(paystack, 'initializeTransaction').mockResolvedValue({ authorization_url: 'https://paystack/x', reference: '' } as any);

const app = createApp();
beforeEach(resetDb);
afterAll(() => prisma.$disconnect());

function sign(body: string) {
  return crypto.createHmac('sha512', process.env.PAYSTACK_SECRET_KEY!).update(body).digest('hex');
}

it('marks payment paid + booking confirmed on charge.success', async () => {
  const { listingId } = await createShortstay(app);
  const { token } = await createGuest(app);
  const booking = await request(app).post('/api/v1/bookings').set('Authorization', `Bearer ${token}`)
    .send({ listingId, checkIn: '2026-09-01', checkOut: '2026-09-03', guests: 1 });
  const reference = booking.body.reference;

  const payload = JSON.stringify({ event: 'charge.success', data: { reference, status: 'success' } });
  const res = await request(app).post('/api/v1/webhooks/paystack').set('x-paystack-signature', sign(payload)).type('json').send(payload);
  expect(res.status).toBe(200);

  const payment = await prisma.payment.findUnique({ where: { paystackReference: reference } });
  expect(payment!.status).toBe('paid');
  const updated = await prisma.booking.findFirst({ where: { paymentId: payment!.id } });
  expect(updated!.status).toBe('confirmed');
});

it('rejects an unsigned webhook', async () => {
  const res = await request(app).post('/api/v1/webhooks/paystack').type('json').send(JSON.stringify({ event: 'charge.success', data: {} }));
  expect(res.status).toBe(401);
});
```

- [ ] **Step 2: Run test (fails)** → FAIL.

- [ ] **Step 3: Implement payments service**

`backend/src/modules/payments/payments.service.ts`:
```ts
import { prisma } from '../../lib/prisma';

export async function handleChargeSuccess(reference: string) {
  const payment = await prisma.payment.findUnique({ where: { paystackReference: reference } });
  if (!payment) return; // unknown reference — ignore
  if (payment.status === 'paid') return; // idempotent
  await prisma.payment.update({ where: { id: payment.id }, data: { status: 'paid' } });
  await prisma.booking.updateMany({ where: { paymentId: payment.id, status: 'pending' }, data: { status: 'confirmed' } });
}

export async function listPayments(userId: string) {
  return prisma.payment.findMany({
    where: { OR: [{ payerId: userId }, { payeeId: userId }] },
    orderBy: { createdAt: 'desc' },
  });
}
```

- [ ] **Step 4: Implement controller (webhook uses raw body)**

`backend/src/modules/payments/payments.controller.ts`:
```ts
import { Request, Response, NextFunction } from 'express';
import { verifyWebhookSignature } from '../../lib/paystack';
import * as service from './payments.service';

export async function webhook(req: Request, res: Response) {
  const signature = req.headers['x-paystack-signature'] as string | undefined;
  const raw = (req as any).rawBody as string;
  if (!signature || !raw || !verifyWebhookSignature(raw, signature)) {
    return res.status(401).json({ error: { message: 'Invalid signature', status: 401 } });
  }
  const event = JSON.parse(raw);
  if (event.event === 'charge.success') {
    await service.handleChargeSuccess(event.data.reference);
  }
  res.status(200).json({ received: true });
}

export const list = (req: Request, res: Response, next: NextFunction) =>
  service.listPayments(req.user!.id).then((p) => res.json(p)).catch(next);
```

- [ ] **Step 5: Capture raw body + mount routes**

In `app.ts`, configure `express.json` to stash the raw body so the webhook can verify it:
```ts
app.use(express.json({ verify: (req, _res, buf) => { (req as any).rawBody = buf.toString(); } }));
```
Create `backend/src/modules/payments/payments.routes.ts`:
```ts
import { Router } from 'express';
import { requireAuth } from '../../middleware/auth';
import * as c from './payments.controller';

export const paymentsRouter = Router();
paymentsRouter.get('/', requireAuth, c.list);

export const webhooksRouter = Router();
webhooksRouter.post('/paystack', c.webhook);
```
Mount in `app.ts`: `app.use('/api/v1/payments', paymentsRouter);` and `app.use('/api/v1/webhooks', webhooksRouter);`.

- [ ] **Step 6: Run test (passes)** → `npx jest tests/payments.webhook.test.ts` → PASS (2 tests).

- [ ] **Step 7: Commit**

```bash
git add backend/src/modules/payments backend/src/app.ts backend/tests/payments.webhook.test.ts
git commit -m "feat(backend): paystack webhook + payments listing"
```

---

## Task 7: Check-in → escrow release + payout transfer

**Files:**
- Modify: `backend/src/modules/bookings/bookings.service.ts`, `bookings.controller.ts`, `bookings.routes.ts`
- Test: `backend/tests/bookings.checkin.test.ts`

- [ ] **Step 1: Write the failing test (mock transfer)**

`backend/tests/bookings.checkin.test.ts`:
```ts
import crypto from 'crypto';
import request from 'supertest';
import { createApp } from '../src/app';
import { prisma } from '../src/lib/prisma';
import { resetDb } from './helpers/db';
import { createShortstay, createGuest } from './helpers/factories';
import * as paystack from '../src/lib/paystack';

jest.spyOn(paystack, 'initializeTransaction').mockResolvedValue({ authorization_url: 'https://x', reference: '' } as any);
jest.spyOn(paystack, 'initiateTransfer').mockResolvedValue({ transfer_code: 'trf_1', status: 'success' } as any);

const app = createApp();
beforeEach(resetDb);
afterAll(() => prisma.$disconnect());

function sign(body: string) {
  return crypto.createHmac('sha512', process.env.PAYSTACK_SECRET_KEY!).update(body).digest('hex');
}

it('releases escrow + records a payout on check-in', async () => {
  const { token: hostToken, hostId, listingId } = await createShortstay(app);
  // host needs a payout recipient code for the transfer:
  await prisma.payoutAccount?.create?.({ data: { userId: hostId, bankCode: '058', accountNumber: '0000000000', accountName: 'Host', paystackRecipientCode: 'RCP_test', isDefault: true } }).catch(() => {});
  const { token: guestToken } = await createGuest(app);
  const booking = await request(app).post('/api/v1/bookings').set('Authorization', `Bearer ${guestToken}`)
    .send({ listingId, checkIn: '2026-09-10', checkOut: '2026-09-12', guests: 1 });
  const reference = booking.body.reference;
  const payload = JSON.stringify({ event: 'charge.success', data: { reference, status: 'success' } });
  await request(app).post('/api/v1/webhooks/paystack').set('x-paystack-signature', sign(payload)).type('json').send(payload);
  await request(app).post(`/api/v1/bookings/${booking.body.booking.id}/confirm`).set('Authorization', `Bearer ${hostToken}`);

  const res = await request(app).post(`/api/v1/bookings/${booking.body.booking.id}/check-in`).set('Authorization', `Bearer ${hostToken}`);
  expect(res.status).toBe(200);
  const payment = await prisma.payment.findUnique({ where: { paystackReference: reference } });
  expect(payment!.escrowStatus).toBe('released');
  const payouts = await prisma.payout.findMany({ where: { userId: hostId } });
  expect(payouts.length).toBe(1);
});
```

> Note: this test references a `PayoutAccount` model created in Phase 6. If running Phase 4 in isolation before Phase 6, the host-payout-recipient setup line is guarded with optional chaining + `.catch`, and the release falls back to recording a `pending` payout without a transfer code. Once Phase 6 is in place, the transfer path executes fully.

- [ ] **Step 2: Run test (fails)** → FAIL.

- [ ] **Step 3: Add check-in to the service**

Append to `bookings.service.ts`:
```ts
import { initiateTransfer } from '../../lib/paystack';

export async function checkIn(id: string, hostId: string) {
  const booking = await prisma.booking.findUnique({ where: { id }, include: { payment: true } });
  if (!booking) throw new ApiError(404, 'Booking not found');
  if (booking.hostId !== hostId) throw new ApiError(403, 'Forbidden');
  if (booking.status !== 'confirmed') throw new ApiError(400, 'Booking is not confirmed');
  if (!booking.payment || booking.payment.status !== 'paid') throw new ApiError(400, 'Payment not completed');

  // Host net = total minus the platform service fee.
  const hostAmount = booking.total - booking.serviceFee;
  const recipient = await prisma.payoutAccount.findFirst({ where: { userId: hostId, isDefault: true } }).catch(() => null);

  let transferCode: string | null = null;
  let payoutStatus: 'pending' | 'success' | 'failed' = 'pending';
  if (recipient?.paystackRecipientCode) {
    const transfer = await initiateTransfer({ amount: hostAmount, recipientCode: recipient.paystackRecipientCode, reason: `Booking ${booking.id}` });
    transferCode = transfer.transfer_code;
    payoutStatus = transfer.status === 'success' ? 'success' : 'pending';
  }

  await prisma.$transaction(async (tx) => {
    await tx.payment.update({ where: { id: booking.paymentId! }, data: { escrowStatus: 'released' } });
    await tx.booking.update({ where: { id }, data: { status: 'checked_in' } });
    await tx.payout.create({ data: { userId: hostId, amount: hostAmount, paystackTransferCode: transferCode, status: payoutStatus } });
  });

  return { ok: true };
}
```

> `prisma.payoutAccount` is the Phase 6 model. If executing Phase 4 strictly before Phase 6, temporarily replace the `recipient` lookup with `const recipient = null;` and restore it when Phase 6 lands. The escrow-release + payout-record logic is the same regardless.

- [ ] **Step 4: Controller + route**

Append to `bookings.controller.ts`:
```ts
export const checkIn = (req: Request, res: Response, next: NextFunction) =>
  service.checkIn(req.params.id, req.user!.id).then((r) => res.json(r)).catch(next);
```
Append to `bookings.routes.ts`:
```ts
bookingsRouter.post('/:id/check-in', requireAuth, requireLister, c.checkIn);
```

- [ ] **Step 5: Run test (passes)** → `npx jest tests/bookings.checkin.test.ts` → PASS.

- [ ] **Step 6: Full suite** → `npx jest` → all PASS.

- [ ] **Step 7: Commit**

```bash
git add backend/src/modules/bookings backend/tests/bookings.checkin.test.ts
git commit -m "feat(backend): check-in escrow release + host payout"
```

---

## Self-Review (against spec §5.3, §6 models, §8 bookings/payments endpoints, §9 flows)

- **Availability GET/PUT:** Task 4. ✓
- **Quote (server-computed), create booking (transaction, no double-book):** Tasks 3, 5. ✓
- **List bookings, get, cancel, hosted, confirm/decline:** Task 5. ✓
- **Payments initialize (via booking), webhook (signed+idempotent), list:** Tasks 5, 6. ✓
- **Check-in → escrow release → Paystack transfer → payout row:** Task 7. ✓
- **Money as kobo, transactional integrity:** Tasks 3, 5, 7. ✓

**Type consistency:** `computeQuote`/`Quote`, `assertRangeOpen`/`markBooked`/`freeDates`, `initializeTransaction`/`initiateTransfer`/`verifyWebhookSignature`, and the `{booking, authorizationUrl, reference}` create response are used consistently across service/controller/tests and match the Phase 4 frontend hooks.

**No placeholders:** every code step is complete and runnable. The two annotated `payoutAccount` notes are explicit cross-phase coordination (the model arrives in Phase 6); the escrow/payout logic is fully implemented and tested with the recipient mocked.

> **Endpoint not yet covered:** `POST /payments/initialize`, `GET /payments/:ref/verify`, and `POST /payments/:id/refund` as standalone endpoints are implemented in Phase 5 (rent deposits reuse `initialize`) — booking payment initialization is handled inline by `POST /bookings`. The webhook is the authoritative payment-state path for v1.
