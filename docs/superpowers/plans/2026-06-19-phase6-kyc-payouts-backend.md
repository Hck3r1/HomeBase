# Phase 6 — KYC (Dojah) & Payouts (Backend) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let listers verify their identity through **Dojah** (ID/BVN) and, once verified, register a **Paystack transfer recipient** as their payout account and view their earnings (escrow held vs. released) and payout history. Identity gating (`requireKyc`) blocks payout setup and transfers until KYC status is `verified`.

**Architecture:** A `kyc` module (`src/modules/kyc`) and a `payouts` module (`src/modules/payouts`) hold schemas/service/controller/routes. A new `src/lib/dojah.ts` wraps Dojah identity lookups (BVN/NIN) + webhook parsing/signature verification. The **Phase 4** `src/lib/paystack.ts` is reused for transfer recipients/transfers and is extended here with `resolveAccountNumber` + `listBanks`. The **Phase 4** `Payment`/`Payout` models are reused: earnings are derived from `Payment` rows where the user is `payee` (escrow `held` vs `released`) minus successful `Payout` rows. A new `requireKyc` middleware (`src/middleware/kyc.ts`) enforces verification on payout setup. New Prisma models `KycVerification` and `PayoutAccount` are added. Reuses Phase 1 `requireAuth`/`requireLister`, the `validate` middleware, `ApiError`/`errorHandler`, the `prisma` singleton, and `createApp()`.

**Tech Stack:** Express, Prisma, PostgreSQL, Zod, axios (Dojah + Paystack clients), Jest, Supertest.

> **Note on git:** Each task ends with a commit run in your own terminal. Assumes Phases 0–5 complete (`createApp()`, `ApiError`/`errorHandler`, `prisma`, `env`/`parseEnv`, `requireAuth`/`requireLister`, `validate`, `tests/helpers/db.ts` `resetDb`, and the Phase 4 `src/lib/paystack.ts` exporting an axios `paystackClient`, `createTransferRecipient`, `initiateTransfer`, plus `Payment`/`Payout` models).

> All paths relative to `backend/`. API base is `/api/v1`. All money is integer **kobo** (NGN minor unit).

---

## File Structure (created/modified this phase)

```
backend/
├── prisma/schema.prisma                  # + KycVerification, PayoutAccount, KycStatus enum
├── src/
│   ├── config/env.ts                     # MODIFY: Dojah keys
│   ├── lib/dojah.ts                      # Dojah ID/BVN lookup + webhook verify/parse
│   ├── lib/paystack.ts                   # MODIFY: resolveAccountNumber + listBanks
│   ├── middleware/kyc.ts                 # requireKyc
│   ├── modules/kyc/kyc.schemas.ts
│   ├── modules/kyc/kyc.service.ts
│   ├── modules/kyc/kyc.controller.ts
│   ├── modules/kyc/kyc.routes.ts
│   ├── modules/payouts/payouts.schemas.ts
│   ├── modules/payouts/payouts.service.ts
│   ├── modules/payouts/payouts.controller.ts
│   ├── modules/payouts/payouts.routes.ts
│   └── app.ts                            # MODIFY: mount kyc + payouts routers
└── tests/
    ├── helpers/db.ts                     # MODIFY: extend TRUNCATE
    ├── dojah.test.ts
    ├── paystack.resolve.test.ts
    ├── middleware.kyc.test.ts
    ├── kyc.test.ts
    └── payout-account.test.ts
```

---

## Task 1: Prisma models for KYC & payout accounts

**Files:**
- Modify: `backend/prisma/schema.prisma`

- [ ] **Step 1: Add the enum + models to `schema.prisma`**

Append:
```prisma
enum KycStatus {
  pending
  verified
  rejected
}

model KycVerification {
  id          String    @id @default(uuid())
  userId      String    @unique
  user        User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  provider    String    @default("dojah")
  idType      String
  reference   String
  status      KycStatus @default(pending)
  rawResponse Json?
  verifiedAt  DateTime?
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt

  @@index([reference])
}

model PayoutAccount {
  id                    String   @id @default(uuid())
  userId                String
  user                  User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  bankCode              String
  accountNumber         String
  accountName           String
  paystackRecipientCode String
  isDefault             Boolean  @default(true)
  createdAt             DateTime @default(now())

  @@index([userId])
}
```

> One active KYC record per user (`userId @unique`) keeps gating lookups O(1) and lets `POST /kyc` upsert on retry. A user may hold multiple `PayoutAccount` rows; exactly one is `isDefault`.

- [ ] **Step 2: Add the back-relations to `User`**

In the existing `User` model, add (keep all existing fields/relations):
```prisma
  kyc            KycVerification?
  payoutAccounts PayoutAccount[]
```

- [ ] **Step 3: Run the migration**

Run: `npm run prisma:migrate -- --name kyc_payout_accounts`
Expected: migration applies; `KycVerification`, `PayoutAccount` tables + `KycStatus` enum created; client regenerated.

- [ ] **Step 4: Commit**

```bash
git add backend/prisma && git commit -m "feat(backend): kyc-verification + payout-account models"
```

---

## Task 2: Extend env config for Dojah

**Files:**
- Modify: `backend/src/config/env.ts`
- Modify: `backend/.env.example`

- [ ] **Step 1: Add keys to the Zod schema in `env.ts`**

Add these keys to `EnvSchema` (keep existing ones):
```ts
  DOJAH_APP_ID: z.string().default('test-dojah-app'),
  DOJAH_SECRET_KEY: z.string().default('test-dojah-secret'),
  DOJAH_BASE_URL: z.string().url().default('https://api.dojah.io'),
```

- [ ] **Step 2: Append to `.env.example`**

```
DOJAH_APP_ID=
DOJAH_SECRET_KEY=
DOJAH_BASE_URL=https://api.dojah.io
```

- [ ] **Step 3: Commit**

```bash
git add backend/src/config/env.ts backend/.env.example
git commit -m "feat(backend): dojah env config"
```

---

## Task 3: Extend the test DB reset helper

**Files:**
- Modify: `backend/tests/helpers/db.ts`

- [ ] **Step 1: Add the new tables to the TRUNCATE list**

In `resetDb`, extend the `TRUNCATE` statement so it also clears the Phase 6 tables (keep all tables already listed from earlier phases; order does not matter because of `CASCADE`):
```ts
import { prisma } from '../../src/lib/prisma';

export async function resetDb() {
  await prisma.$executeRawUnsafe(
    'TRUNCATE TABLE "PayoutAccount","KycVerification","Payout","Payment","ListingPhoto","ListingRentDetails","ListingSaleDetails","ListingShortstayDetails","Listing","PushToken","AuthProvider","User" RESTART IDENTITY CASCADE',
  );
}
```

> Keep any additional tables your earlier phases already added in the list. The two new names this phase requires are `"PayoutAccount"` and `"KycVerification"`.

- [ ] **Step 2: Commit**

```bash
git add backend/tests/helpers/db.ts
git commit -m "test(backend): reset kyc + payout-account tables"
```

---

## Task 4: Dojah lib (ID/BVN lookup + webhook)

**Files:**
- Create: `backend/src/lib/dojah.ts`
- Test: `backend/tests/dojah.test.ts`

- [ ] **Step 1: Write the failing test (mock axios client)**

`backend/tests/dojah.test.ts`:
```ts
import { dojahClient, initiateVerification, mapDojahStatus, signDojahPayload, verifyDojahSignature } from '../src/lib/dojah';

describe('dojah lib', () => {
  it('initiates a BVN lookup and returns the entity + reference', async () => {
    jest.spyOn(dojahClient, 'get').mockResolvedValue({
      data: { entity: { bvn: '22222222222', first_name: 'Moyo', last_name: 'Ade' } },
    } as any);
    const result = await initiateVerification('bvn', '22222222222');
    expect(result.matched).toBe(true);
    expect(result.entity?.first_name).toBe('Moyo');
    expect(result.reference).toBeTruthy();
  });

  it('throws a 422 when the identity is not found', async () => {
    jest.spyOn(dojahClient, 'get').mockRejectedValue({ response: { status: 404 } });
    await expect(initiateVerification('nin', '00000000000')).rejects.toMatchObject({ status: 422 });
  });

  it('maps provider statuses to KYC statuses', () => {
    expect(mapDojahStatus('approved')).toBe('verified');
    expect(mapDojahStatus('verified')).toBe('verified');
    expect(mapDojahStatus('rejected')).toBe('rejected');
    expect(mapDojahStatus('failed')).toBe('rejected');
    expect(mapDojahStatus('processing')).toBe('pending');
  });

  it('verifies its own HMAC signature', () => {
    const body = { reference: 'bvn:22222222222', status: 'approved' };
    const sig = signDojahPayload(JSON.stringify(body));
    expect(verifyDojahSignature(JSON.stringify(body), sig)).toBe(true);
    expect(verifyDojahSignature(JSON.stringify(body), 'tampered')).toBe(false);
  });
});
```

- [ ] **Step 2: Install axios (if not already present) + run test (fails)**

Run: `npm install axios`
Run: `npx jest tests/dojah.test.ts` → FAIL (module not found).

- [ ] **Step 3: Implement `dojah.ts`**

`backend/src/lib/dojah.ts`:
```ts
import axios from 'axios';
import crypto from 'crypto';
import { parseEnv } from '../config/env';
import { ApiError } from '../middleware/error';

const env = parseEnv(process.env);

export const dojahClient = axios.create({
  baseURL: env.DOJAH_BASE_URL,
  headers: { Authorization: env.DOJAH_SECRET_KEY, AppId: env.DOJAH_APP_ID },
  timeout: 15_000,
});

export type DojahIdType = 'bvn' | 'nin';

export interface DojahLookupResult {
  reference: string;
  matched: boolean;
  entity: Record<string, unknown> | null;
  raw: unknown;
}

// Concrete Dojah ID/BVN lookup endpoints (NGN identity APIs).
const LOOKUP_PATH: Record<DojahIdType, (id: string) => string> = {
  bvn: (id) => `/api/v1/kyc/bvn/full?bvn=${encodeURIComponent(id)}`,
  nin: (id) => `/api/v1/kyc/nin?nin=${encodeURIComponent(id)}`,
};

export async function initiateVerification(idType: DojahIdType, idNumber: string): Promise<DojahLookupResult> {
  try {
    const { data } = await dojahClient.get(LOOKUP_PATH[idType](idNumber));
    const entity = (data as { entity?: Record<string, unknown> })?.entity ?? null;
    return {
      reference: (entity?.reference as string) ?? `${idType}:${idNumber}`,
      matched: Boolean(entity),
      entity,
      raw: data,
    };
  } catch (e) {
    const status = (e as { response?: { status?: number } }).response?.status;
    if (status === 404 || status === 422) throw new ApiError(422, 'Identity could not be verified');
    throw new ApiError(502, 'KYC provider unavailable');
  }
}

export type KycStatusValue = 'pending' | 'verified' | 'rejected';

export function mapDojahStatus(raw: string): KycStatusValue {
  const value = (raw ?? '').toLowerCase();
  if (['approved', 'verified', 'successful', 'success'].includes(value)) return 'verified';
  if (['rejected', 'failed', 'declined', 'unverified'].includes(value)) return 'rejected';
  return 'pending';
}

export function signDojahPayload(rawBody: string): string {
  return crypto.createHmac('sha512', env.DOJAH_SECRET_KEY).update(rawBody).digest('hex');
}

export function verifyDojahSignature(rawBody: string, signature?: string): boolean {
  if (!signature) return false;
  const expected = signDojahPayload(rawBody);
  const a = Buffer.from(expected);
  const b = Buffer.from(signature);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

export interface DojahWebhookEvent {
  reference: string;
  status: KycStatusValue;
  raw: unknown;
}

export function parseDojahWebhook(payload: Record<string, unknown>): DojahWebhookEvent {
  const reference = (payload.reference ?? payload.reference_id ?? '') as string;
  const status = mapDojahStatus((payload.status ?? payload.verification_status ?? '') as string);
  return { reference, status, raw: payload };
}
```

- [ ] **Step 4: Run test (passes)** → `npx jest tests/dojah.test.ts` → PASS.

- [ ] **Step 5: Commit**

```bash
git add backend/src/lib/dojah.ts backend/tests/dojah.test.ts backend/package.json
git commit -m "feat(backend): dojah id/bvn lookup + webhook lib"
```

---

## Task 5: Extend Paystack lib (resolve account + list banks)

**Files:**
- Modify: `backend/src/lib/paystack.ts`
- Test: `backend/tests/paystack.resolve.test.ts`

- [ ] **Step 1: Write the failing test (mock the Phase 4 axios client)**

`backend/tests/paystack.resolve.test.ts`:
```ts
import { paystackClient, resolveAccountNumber, listBanks } from '../src/lib/paystack';

describe('paystack account helpers', () => {
  it('resolves an account name', async () => {
    jest.spyOn(paystackClient, 'get').mockResolvedValue({
      data: { status: true, data: { account_number: '0123456789', account_name: 'MOYO ADE' } },
    } as any);
    const res = await resolveAccountNumber('0123456789', '058');
    expect(res.accountName).toBe('MOYO ADE');
    expect(res.accountNumber).toBe('0123456789');
  });

  it('lists NGN banks as {name, code}', async () => {
    jest.spyOn(paystackClient, 'get').mockResolvedValue({
      data: { status: true, data: [{ name: 'GTBank', code: '058', slug: 'gtbank' }] },
    } as any);
    const banks = await listBanks();
    expect(banks[0]).toEqual({ name: 'GTBank', code: '058' });
  });
});
```

- [ ] **Step 2: Run test (fails)** → `npx jest tests/paystack.resolve.test.ts` → FAIL (functions missing).

- [ ] **Step 3: Append the helpers to `paystack.ts`**

Append to the existing Phase 4 `backend/src/lib/paystack.ts` (it already exports the axios `paystackClient` instance configured with `Authorization: Bearer <PAYSTACK_SECRET_KEY>`, plus `createTransferRecipient` and `initiateTransfer`):
```ts
export interface ResolvedAccount {
  accountNumber: string;
  accountName: string;
}

export async function resolveAccountNumber(accountNumber: string, bankCode: string): Promise<ResolvedAccount> {
  try {
    const { data } = await paystackClient.get(
      `/bank/resolve?account_number=${encodeURIComponent(accountNumber)}&bank_code=${encodeURIComponent(bankCode)}`,
    );
    return { accountNumber: data.data.account_number, accountName: data.data.account_name };
  } catch {
    throw new ApiError(422, 'Could not resolve account number');
  }
}

export interface Bank {
  name: string;
  code: string;
}

export async function listBanks(): Promise<Bank[]> {
  const { data } = await paystackClient.get('/bank?currency=NGN&country=nigeria');
  return (data.data as Array<{ name: string; code: string }>).map((b) => ({ name: b.name, code: b.code }));
}
```

> Ensure `ApiError` is imported at the top of `paystack.ts` (`import { ApiError } from '../middleware/error';`) if it is not already.

- [ ] **Step 4: Run test (passes)** → `npx jest tests/paystack.resolve.test.ts` → PASS.

- [ ] **Step 5: Commit**

```bash
git add backend/src/lib/paystack.ts backend/tests/paystack.resolve.test.ts
git commit -m "feat(backend): paystack resolve-account + list-banks helpers"
```

---

## Task 6: requireKyc middleware

**Files:**
- Create: `backend/src/middleware/kyc.ts`
- Test: `backend/tests/middleware.kyc.test.ts`

- [ ] **Step 1: Write the failing test**

`backend/tests/middleware.kyc.test.ts`:
```ts
import express from 'express';
import request from 'supertest';
import { requireAuth } from '../src/middleware/auth';
import { requireKyc } from '../src/middleware/kyc';
import { errorHandler } from '../src/middleware/error';
import { signAccessToken } from '../src/lib/jwt';
import { prisma } from '../src/lib/prisma';
import { resetDb } from './helpers/db';

function app() {
  const a = express();
  a.get('/payouts/setup', requireAuth, requireKyc, (_req, res) => res.json({ ok: true }));
  a.use(errorHandler);
  return a;
}

beforeEach(resetDb);
afterAll(() => prisma.$disconnect());

async function tokenFor(kyc: 'none' | 'pending' | 'verified') {
  const user = await prisma.user.create({
    data: { name: 'L', email: `k${Math.random()}@x.com`, role: 'lister', listerType: 'agent' },
  });
  if (kyc !== 'none') {
    await prisma.kycVerification.create({
      data: { userId: user.id, provider: 'dojah', idType: 'bvn', reference: `r-${user.id}`, status: kyc },
    });
  }
  return signAccessToken({ sub: user.id, role: 'lister' });
}

describe('requireKyc', () => {
  it('403 when no KYC record', async () => {
    const t = await tokenFor('none');
    expect((await request(app()).get('/payouts/setup').set('Authorization', `Bearer ${t}`)).status).toBe(403);
  });
  it('403 when KYC pending', async () => {
    const t = await tokenFor('pending');
    expect((await request(app()).get('/payouts/setup').set('Authorization', `Bearer ${t}`)).status).toBe(403);
  });
  it('200 when KYC verified', async () => {
    const t = await tokenFor('verified');
    expect((await request(app()).get('/payouts/setup').set('Authorization', `Bearer ${t}`)).status).toBe(200);
  });
});
```

- [ ] **Step 2: Run test (fails)** → `npx jest tests/middleware.kyc.test.ts` → FAIL.

- [ ] **Step 3: Implement `kyc.ts`**

`backend/src/middleware/kyc.ts`:
```ts
import { NextFunction, Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { ApiError } from './error';

export async function requireKyc(req: Request, _res: Response, next: NextFunction) {
  try {
    const kyc = await prisma.kycVerification.findUnique({ where: { userId: req.user!.id } });
    if (kyc?.status !== 'verified') {
      return next(new ApiError(403, 'Identity verification required'));
    }
    next();
  } catch (e) {
    next(e);
  }
}
```

- [ ] **Step 4: Run test (passes)** → `npx jest tests/middleware.kyc.test.ts` → PASS.

- [ ] **Step 5: Commit**

```bash
git add backend/src/middleware/kyc.ts backend/tests/middleware.kyc.test.ts
git commit -m "feat(backend): requireKyc gating middleware"
```

---

## Task 7: KYC module (initiate, status, webhook)

**Files:**
- Create: `backend/src/modules/kyc/kyc.schemas.ts`
- Create: `backend/src/modules/kyc/kyc.service.ts`
- Create: `backend/src/modules/kyc/kyc.controller.ts`
- Create: `backend/src/modules/kyc/kyc.routes.ts`
- Modify: `backend/src/app.ts`
- Test: `backend/tests/kyc.test.ts`

- [ ] **Step 1: Write the failing test (mock Dojah)**

`backend/tests/kyc.test.ts`:
```ts
import request from 'supertest';
import { createApp } from '../src/app';
import { prisma } from '../src/lib/prisma';
import { resetDb } from './helpers/db';
import * as dojah from '../src/lib/dojah';
import { signDojahPayload } from '../src/lib/dojah';

const app = createApp();
beforeEach(resetDb);
afterAll(() => prisma.$disconnect());

jest.spyOn(dojah, 'initiateVerification').mockResolvedValue({
  reference: 'bvn:22222222222',
  matched: true,
  entity: { first_name: 'Moyo' },
  raw: { entity: { first_name: 'Moyo' } },
});

async function listerToken(email: string) {
  const reg = await request(app).post('/api/v1/auth/register').send({ name: 'L', email, password: 'password1' });
  await request(app).patch('/api/v1/me/role').set('Authorization', `Bearer ${reg.body.accessToken}`).send({ role: 'lister', listerType: 'agent' });
  const login = await request(app).post('/api/v1/auth/login').send({ email, password: 'password1' });
  return login.body.accessToken as string;
}

describe('KYC flow', () => {
  it('initiates verification and reports pending', async () => {
    const token = await listerToken('kyc1@x.com');
    const init = await request(app).post('/api/v1/kyc').set('Authorization', `Bearer ${token}`).send({ idType: 'bvn', idNumber: '22222222222' });
    expect(init.status).toBe(201);
    expect(init.body.status).toBe('pending');

    const status = await request(app).get('/api/v1/kyc/status').set('Authorization', `Bearer ${token}`);
    expect(status.status).toBe(200);
    expect(status.body.status).toBe('pending');
  });

  it('webhook transitions status to verified', async () => {
    const token = await listerToken('kyc2@x.com');
    await request(app).post('/api/v1/kyc').set('Authorization', `Bearer ${token}`).send({ idType: 'bvn', idNumber: '22222222222' });

    const payload = { reference: 'bvn:22222222222', status: 'approved' };
    const raw = JSON.stringify(payload);
    const res = await request(app)
      .post('/api/v1/webhooks/dojah')
      .set('x-dojah-signature', signDojahPayload(raw))
      .set('Content-Type', 'application/json')
      .send(payload);
    expect(res.status).toBe(200);

    const status = await request(app).get('/api/v1/kyc/status').set('Authorization', `Bearer ${token}`);
    expect(status.body.status).toBe('verified');
    expect(status.body.verifiedAt).toBeTruthy();
  });

  it('rejects a webhook with a bad signature', async () => {
    const res = await request(app)
      .post('/api/v1/webhooks/dojah')
      .set('x-dojah-signature', 'nope')
      .send({ reference: 'bvn:22222222222', status: 'approved' });
    expect(res.status).toBe(401);
  });
});
```

- [ ] **Step 2: Run test (fails)** → `npx jest tests/kyc.test.ts` → FAIL (routes missing).

- [ ] **Step 3: Implement schemas**

`backend/src/modules/kyc/kyc.schemas.ts`:
```ts
import { z } from 'zod';

export const startKycSchema = z.object({
  body: z.object({
    idType: z.enum(['bvn', 'nin']),
    idNumber: z.string().regex(/^\d{8,15}$/, 'Enter a valid ID/BVN number'),
  }),
});
```

- [ ] **Step 4: Implement the service**

`backend/src/modules/kyc/kyc.service.ts`:
```ts
import { prisma } from '../../lib/prisma';
import { Prisma } from '@prisma/client';
import { initiateVerification, parseDojahWebhook, DojahIdType } from '../../lib/dojah';

export async function startKyc(userId: string, idType: DojahIdType, idNumber: string) {
  const result = await initiateVerification(idType, idNumber);
  const data = {
    provider: 'dojah',
    idType,
    reference: result.reference,
    status: 'pending' as const,
    rawResponse: result.raw as Prisma.InputJsonValue,
    verifiedAt: null,
  };
  return prisma.kycVerification.upsert({
    where: { userId },
    update: data,
    create: { userId, ...data },
  });
}

export async function getStatus(userId: string) {
  const kyc = await prisma.kycVerification.findUnique({ where: { userId } });
  if (!kyc) return { status: 'none', idType: null, reference: null, verifiedAt: null };
  return { status: kyc.status, idType: kyc.idType, reference: kyc.reference, verifiedAt: kyc.verifiedAt };
}

export async function applyWebhook(payload: Record<string, unknown>) {
  const event = parseDojahWebhook(payload);
  if (!event.reference) return;
  const record = await prisma.kycVerification.findFirst({ where: { reference: event.reference } });
  if (!record) return; // idempotent: unknown reference is ignored
  await prisma.kycVerification.update({
    where: { id: record.id },
    data: {
      status: event.status,
      verifiedAt: event.status === 'verified' ? new Date() : null,
      rawResponse: event.raw as Prisma.InputJsonValue,
    },
  });
}
```

- [ ] **Step 5: Implement the controller**

`backend/src/modules/kyc/kyc.controller.ts`:
```ts
import { Request, Response, NextFunction } from 'express';
import * as service from './kyc.service';
import { verifyDojahSignature } from '../../lib/dojah';
import { ApiError } from '../../middleware/error';

export const start = (req: Request, res: Response, next: NextFunction) =>
  service.startKyc(req.user!.id, req.body.idType, req.body.idNumber).then((k) => res.status(201).json(k)).catch(next);

export const status = (req: Request, res: Response, next: NextFunction) =>
  service.getStatus(req.user!.id).then((s) => res.json(s)).catch(next);

export async function webhook(req: Request, res: Response, next: NextFunction) {
  try {
    const raw = JSON.stringify(req.body);
    if (!verifyDojahSignature(raw, req.header('x-dojah-signature'))) {
      throw new ApiError(401, 'Invalid signature');
    }
    await service.applyWebhook(req.body);
    res.json({ received: true });
  } catch (e) {
    next(e);
  }
}
```

- [ ] **Step 6: Implement routes**

`backend/src/modules/kyc/kyc.routes.ts`:
```ts
import { Router } from 'express';
import { requireAuth, requireLister } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { startKycSchema } from './kyc.schemas';
import * as controller from './kyc.controller';

export const kycRouter = Router();

kycRouter.post('/kyc', requireAuth, requireLister, validate(startKycSchema), controller.start);
kycRouter.get('/kyc/status', requireAuth, controller.status);
kycRouter.post('/webhooks/dojah', controller.webhook);
```

- [ ] **Step 7: Mount in `app.ts`**

Add `app.use('/api/v1', kycRouter);` (import `kycRouter`) before `notFound`.

> The webhook verifies an HMAC-SHA512 of the JSON body keyed by `DOJAH_SECRET_KEY` via the `x-dojah-signature` header. This works with the global `express.json()` since the signature is recomputed over the parsed body; if you later switch to provider-raw signatures, capture the raw buffer with an `express.json({ verify })` hook and verify against it instead.

- [ ] **Step 8: Run test (passes)** → `npx jest tests/kyc.test.ts` → PASS (3 tests).

- [ ] **Step 9: Commit**

```bash
git add backend/src/modules/kyc backend/src/app.ts backend/tests/kyc.test.ts
git commit -m "feat(backend): kyc initiate, status, dojah webhook"
```

---

## Task 8: Payouts module (payout account, banks, earnings)

**Files:**
- Create: `backend/src/modules/payouts/payouts.schemas.ts`
- Create: `backend/src/modules/payouts/payouts.service.ts`
- Create: `backend/src/modules/payouts/payouts.controller.ts`
- Create: `backend/src/modules/payouts/payouts.routes.ts`
- Modify: `backend/src/app.ts`
- Test: `backend/tests/payout-account.test.ts`

- [ ] **Step 1: Write the failing test (mock Paystack)**

`backend/tests/payout-account.test.ts`:
```ts
import request from 'supertest';
import { createApp } from '../src/app';
import { prisma } from '../src/lib/prisma';
import { resetDb } from './helpers/db';
import * as paystack from '../src/lib/paystack';

const app = createApp();
beforeEach(resetDb);
afterAll(() => prisma.$disconnect());

jest.spyOn(paystack, 'createTransferRecipient').mockResolvedValue({ recipient_code: 'RCP_test123' } as any);
jest.spyOn(paystack, 'resolveAccountNumber').mockResolvedValue({ accountNumber: '0123456789', accountName: 'MOYO ADE' });

async function verifiedListerToken(email: string) {
  const reg = await request(app).post('/api/v1/auth/register').send({ name: 'L', email, password: 'password1' });
  await request(app).patch('/api/v1/me/role').set('Authorization', `Bearer ${reg.body.accessToken}`).send({ role: 'lister', listerType: 'agent' });
  const login = await request(app).post('/api/v1/auth/login').send({ email, password: 'password1' });
  await prisma.kycVerification.create({
    data: { userId: reg.body.user.id, provider: 'dojah', idType: 'bvn', reference: `r-${reg.body.user.id}`, status: 'verified', verifiedAt: new Date() },
  });
  return login.body.accessToken as string;
}

describe('payout account', () => {
  it('blocks payout setup until KYC verified (403)', async () => {
    const reg = await request(app).post('/api/v1/auth/register').send({ name: 'L', email: 'pa0@x.com', password: 'password1' });
    await request(app).patch('/api/v1/me/role').set('Authorization', `Bearer ${reg.body.accessToken}`).send({ role: 'lister', listerType: 'agent' });
    const login = await request(app).post('/api/v1/auth/login').send({ email: 'pa0@x.com', password: 'password1' });
    const res = await request(app)
      .post('/api/v1/payout-account')
      .set('Authorization', `Bearer ${login.body.accessToken}`)
      .send({ bankCode: '058', accountNumber: '0123456789', accountName: 'MOYO ADE' });
    expect(res.status).toBe(403);
  });

  it('creates a Paystack recipient and stores the code', async () => {
    const token = await verifiedListerToken('pa1@x.com');
    const res = await request(app)
      .post('/api/v1/payout-account')
      .set('Authorization', `Bearer ${token}`)
      .send({ bankCode: '058', accountNumber: '0123456789', accountName: 'MOYO ADE' });
    expect(res.status).toBe(201);
    expect(res.body.paystackRecipientCode).toBe('RCP_test123');
    expect(res.body.isDefault).toBe(true);
    expect(paystack.createTransferRecipient).toHaveBeenCalled();

    const get = await request(app).get('/api/v1/payout-account').set('Authorization', `Bearer ${token}`);
    expect(get.status).toBe(200);
    expect(get.body.accountNumber).toBe('0123456789');
  });

  it('returns an earnings summary + payout history', async () => {
    const token = await verifiedListerToken('pa2@x.com');
    const me = await request(app).get('/api/v1/me').set('Authorization', `Bearer ${token}`);
    await prisma.payment.create({
      data: {
        payerId: me.body.id, payeeId: me.body.id, purpose: 'booking', amount: 50000, currency: 'NGN',
        paystackReference: 'ref-held', status: 'paid', escrowStatus: 'held',
      },
    });
    await prisma.payment.create({
      data: {
        payerId: me.body.id, payeeId: me.body.id, purpose: 'booking', amount: 30000, currency: 'NGN',
        paystackReference: 'ref-released', status: 'paid', escrowStatus: 'released',
      },
    });
    const res = await request(app).get('/api/v1/payouts').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.summary.escrowHeld).toBe(50000);
    expect(res.body.summary.released).toBe(30000);
    expect(res.body.summary.available).toBe(30000);
    expect(Array.isArray(res.body.payouts)).toBe(true);
  });
});
```

> The earnings test seeds Phase 4 `Payment` rows directly. Adjust the `data` keys only if your Phase 4 `Payment` model named them differently; the contract used here (`payeeId`, `status: 'paid'`, `escrowStatus: 'held' | 'released'`, `amount` in kobo) matches the spec §6 `payments` table.

- [ ] **Step 2: Run test (fails)** → `npx jest tests/payout-account.test.ts` → FAIL.

- [ ] **Step 3: Implement schemas**

`backend/src/modules/payouts/payouts.schemas.ts`:
```ts
import { z } from 'zod';

export const payoutAccountSchema = z.object({
  body: z.object({
    bankCode: z.string().min(2),
    accountNumber: z.string().regex(/^\d{10}$/, 'Account number must be 10 digits'),
    accountName: z.string().min(2),
  }),
});

export const resolveSchema = z.object({
  query: z.object({
    bankCode: z.string().min(2),
    accountNumber: z.string().regex(/^\d{10}$/, 'Account number must be 10 digits'),
  }),
});
```

- [ ] **Step 4: Implement the service**

`backend/src/modules/payouts/payouts.service.ts`:
```ts
import { prisma } from '../../lib/prisma';
import { ApiError } from '../../middleware/error';
import { createTransferRecipient, resolveAccountNumber, listBanks } from '../../lib/paystack';

export async function createPayoutAccount(
  userId: string,
  input: { bankCode: string; accountNumber: string; accountName: string },
) {
  const recipient = await createTransferRecipient({
    type: 'nuban',
    name: input.accountName,
    account_number: input.accountNumber,
    bank_code: input.bankCode,
    currency: 'NGN',
  });
  return prisma.$transaction(async (tx) => {
    await tx.payoutAccount.updateMany({ where: { userId }, data: { isDefault: false } });
    return tx.payoutAccount.create({
      data: {
        userId,
        bankCode: input.bankCode,
        accountNumber: input.accountNumber,
        accountName: input.accountName,
        paystackRecipientCode: recipient.recipient_code,
        isDefault: true,
      },
    });
  });
}

export async function getPayoutAccount(userId: string) {
  const account = await prisma.payoutAccount.findFirst({
    where: { userId },
    orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
  });
  if (!account) throw new ApiError(404, 'No payout account set up');
  return account;
}

export async function resolve(accountNumber: string, bankCode: string) {
  return resolveAccountNumber(accountNumber, bankCode);
}

export async function banks() {
  return listBanks();
}

const sum = (rows: { amount: number }[]) => rows.reduce((acc, r) => acc + r.amount, 0);

export async function getEarnings(userId: string) {
  const payments = await prisma.payment.findMany({ where: { payeeId: userId, status: 'paid' } });
  const escrowHeld = sum(payments.filter((p) => p.escrowStatus === 'held'));
  const released = sum(payments.filter((p) => p.escrowStatus === 'released'));

  const payouts = await prisma.payout.findMany({ where: { userId }, orderBy: { createdAt: 'desc' } });
  const paidOut = sum(payouts.filter((p) => p.status === 'success'));

  return {
    summary: { escrowHeld, released, paidOut, available: released - paidOut },
    payouts,
  };
}
```

- [ ] **Step 5: Implement the controller**

`backend/src/modules/payouts/payouts.controller.ts`:
```ts
import { Request, Response, NextFunction } from 'express';
import * as service from './payouts.service';

export const createAccount = (req: Request, res: Response, next: NextFunction) =>
  service.createPayoutAccount(req.user!.id, req.body).then((a) => res.status(201).json(a)).catch(next);

export const getAccount = (req: Request, res: Response, next: NextFunction) =>
  service.getPayoutAccount(req.user!.id).then((a) => res.json(a)).catch(next);

export const resolveAccount = (req: Request, res: Response, next: NextFunction) =>
  service.resolve(req.query.accountNumber as string, req.query.bankCode as string).then((r) => res.json(r)).catch(next);

export const banks = (_req: Request, res: Response, next: NextFunction) =>
  service.banks().then((b) => res.json(b)).catch(next);

export const earnings = (req: Request, res: Response, next: NextFunction) =>
  service.getEarnings(req.user!.id).then((e) => res.json(e)).catch(next);
```

- [ ] **Step 6: Implement routes**

`backend/src/modules/payouts/payouts.routes.ts`:
```ts
import { Router } from 'express';
import { requireAuth, requireLister } from '../../middleware/auth';
import { requireKyc } from '../../middleware/kyc';
import { validate } from '../../middleware/validate';
import { payoutAccountSchema, resolveSchema } from './payouts.schemas';
import * as controller from './payouts.controller';

export const payoutsRouter = Router();

payoutsRouter.get('/payout-account/banks', requireAuth, requireLister, controller.banks);
payoutsRouter.get('/payout-account/resolve', requireAuth, requireLister, validate(resolveSchema), controller.resolveAccount);
payoutsRouter.post('/payout-account', requireAuth, requireLister, requireKyc, validate(payoutAccountSchema), controller.createAccount);
payoutsRouter.get('/payout-account', requireAuth, requireLister, controller.getAccount);
payoutsRouter.get('/payouts', requireAuth, requireLister, controller.earnings);
```

- [ ] **Step 7: Mount in `app.ts`**

Add `app.use('/api/v1', payoutsRouter);` (import `payoutsRouter`) before `notFound`.

> `GET /payout-account/banks` and `GET /payout-account/resolve` support the frontend bank-select → resolve-name flow; they are read-only and require only a lister (not KYC) so a lister can fill the form before final, KYC-gated submission. `POST /payout-account` is the KYC-gated write.

- [ ] **Step 8: Run test (passes)** → `npx jest tests/payout-account.test.ts` → PASS (3 tests).

- [ ] **Step 9: Commit**

```bash
git add backend/src/modules/payouts backend/src/app.ts backend/tests/payout-account.test.ts
git commit -m "feat(backend): payout account + banks/resolve + earnings"
```

---

## Task 9: Full suite green

- [ ] **Step 1: Run everything** → `npx jest` → all PASS.
- [ ] **Step 2: Commit any cleanups**

```bash
git add -A && git commit -m "test(backend): phase 6 kyc + payouts suite green" || echo "nothing to commit"
```

---

## Self-Review (against spec §5.6, §6 models, §8 KYC & payouts endpoints, §9.3, §10 NFRs)

- **Models `kyc_verifications` (provider dojah, id_type, reference, status, raw_response jsonb, verified_at) + `payout_accounts` (bank_code, account_number, account_name, paystack_recipient_code, is_default):** Task 1. ✓ (+ migration; `resetDb` extended in Task 3.)
- **Dojah lib (`DOJAH_APP_ID`/`DOJAH_SECRET_KEY` from env, concrete BVN/NIN lookup request shape, webhook parse + HMAC verify):** Tasks 2, 4. ✓
- **`requireKyc` gating payout setup/transfers until `status === 'verified'`:** Task 6 + applied on `POST /payout-account` (Task 8). ✓
- **`POST /kyc` (initiate Dojah), `GET /kyc/status`, `POST /webhooks/dojah` (status update):** Task 7. ✓
- **`POST /payout-account` (Paystack transfer recipient via reused `paystack.ts` + store `recipient_code`), `GET /payout-account`, `GET /payouts`:** Task 8. ✓
- **Reused Phase 4 Paystack lib + `Payment`/`Payout` models:** Task 5 extends `paystack.ts` (`resolveAccountNumber`, `listBanks`) reusing the existing `paystackClient`/`createTransferRecipient`; earnings derive from `Payment` (escrow held/released) and `Payout` (Task 8). ✓
- **Tests (mock Dojah + Paystack): KYC status transition, requireKyc gating, payout-account creation:** `kyc.test.ts`, `middleware.kyc.test.ts`, `payout-account.test.ts` (+ `dojah.test.ts`, `paystack.resolve.test.ts`). ✓
- **NFRs (signed webhooks, validation, idempotent webhook by reference, money in kobo, least-privilege role checks):** webhook HMAC + idempotent unknown-reference no-op (Task 7), Zod schemas (Tasks 7–8), kobo integers throughout, `requireAuth`/`requireLister`/`requireKyc` layering. ✓

**Type consistency:** `DojahIdType`/`KycStatusValue` from `dojah.ts` flow into `kyc.service`; `KycStatus` enum matches the `'pending'|'verified'|'rejected'` mapping; `createTransferRecipient` input (`{type,name,account_number,bank_code,currency}`) and `{recipient_code}` output match the Phase 4 lib contract; `ResolvedAccount`/`Bank` shapes are reused by the frontend resolve/bank-select hooks; `getEarnings` returns `{summary:{escrowHeld,released,paidOut,available}, payouts}` consumed by the frontend Earnings screen.

**No placeholders:** every code step is complete and runnable. The only narrative notes (Dojah raw-signature alternative, and the Phase 4 `Payment` field-name caveat) are explicit integration guidance bounded to already-reused, prior-phase code — not missing requirements.
