# Phase 5 — Rent Applications, Sale Inquiries & Viewings (Backend) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the non-short-stay transaction flows: **rent applications** (with a Paystack security-deposit charge), **sale inquiries** (lead-gen message threads), and **viewings/inspections** (request → confirm/reschedule/cancel/complete) shared across rent & sale. All endpoints enforce ownership/role checks and validate input with Zod.

**Architecture:** Three new modules — `src/modules/applications`, `src/modules/inquiries`, `src/modules/viewings` — each with `*.schemas.ts`, `*.service.ts`, `*.controller.ts`, `*.routes.ts`, following the Phase 1/2 module pattern. New Prisma models `Application`, `Inquiry`, `Viewing` (+ enums) are added; `Application.depositPaymentId` references the **Phase 4 `Payment` model**. Creating an application opens a DB transaction that creates a `Payment(initialized, purpose=rent_deposit)` plus the `Application(pending)`, then initializes a Paystack charge via the **Phase 4 `src/lib/paystack.ts`** helper and returns the `authorizationUrl` for the mobile client to complete. Reuses Phase 1 `requireAuth`/`requireLister`, the `validate(schema)` middleware, the `prisma` singleton, `ApiError`/`errorHandler`, and the `createApp()` factory.

> **Reused from Phase 4 (assumed present):**
> - `src/lib/paystack.ts` exporting `initializeTransaction(params: { email: string; amountKobo: number; reference?: string; metadata?: Record<string, unknown> }): Promise<{ authorizationUrl: string; accessCode: string; reference: string }>`.
> - The `Payment` Prisma model (spec §6): `id, payerId, payeeId, listingId, purpose (booking|rent_deposit|rent), amount, currency, paystackReference, status (initialized|paid|failed|refunded), escrowStatus (none|held|released|refunded), releaseAt, createdAt`.

**Tech Stack:** Express, Prisma, PostgreSQL, Zod, Jest, Supertest. (Paystack charge init reuses the Phase 4 lib.)

> **Note on git:** Each task ends with a commit run in your own terminal. Assumes Phases 0–4 are complete (`createApp()`, `ApiError`/`errorHandler`, `prisma`, `requireAuth`/`requireLister`, `validate`, `Listing`/`ListingRentDetails`, the `Payment` model, and `src/lib/paystack.ts`).

> All paths relative to `backend/`.

---

## File Structure (created/modified this phase)

```
backend/
├── prisma/schema.prisma                          # + Application, Inquiry, Viewing + enums; back-relations on User/Listing/Payment
├── src/
│   ├── modules/applications/applications.schemas.ts
│   ├── modules/applications/applications.service.ts
│   ├── modules/applications/applications.controller.ts
│   ├── modules/applications/applications.routes.ts
│   ├── modules/inquiries/inquiries.schemas.ts
│   ├── modules/inquiries/inquiries.service.ts
│   ├── modules/inquiries/inquiries.controller.ts
│   ├── modules/inquiries/inquiries.routes.ts
│   ├── modules/viewings/viewings.schemas.ts
│   ├── modules/viewings/viewings.service.ts
│   ├── modules/viewings/viewings.controller.ts
│   ├── modules/viewings/viewings.routes.ts
│   └── app.ts                                     # MODIFY: mount applications/inquiries/viewings routers + /me/* lister routes
└── tests/
    ├── helpers/db.ts                              # MODIFY: extend TRUNCATE with new tables
    ├── helpers/factories.ts                       # MODIFY/CREATE: seeker + lister + rent/sale listing helpers
    ├── applications.create.test.ts
    ├── applications.status.test.ts
    ├── inquiries.test.ts
    └── viewings.test.ts
```

---

## Task 1: Prisma models for applications, inquiries, viewings

**Files:**
- Modify: `backend/prisma/schema.prisma`

- [ ] **Step 1: Append enums + models to `schema.prisma`**

```prisma
enum ApplicationStatus {
  pending
  approved
  rejected
  withdrawn
}

enum InquiryStatus {
  open
  closed
}

enum ViewingStatus {
  requested
  confirmed
  rescheduled
  cancelled
  completed
}

model Application {
  id               String            @id @default(uuid())
  listingId        String
  listing          Listing           @relation(fields: [listingId], references: [id], onDelete: Cascade)
  applicantId      String
  applicant        User              @relation("ApplicationApplicant", fields: [applicantId], references: [id], onDelete: Cascade)
  hostId           String
  host             User              @relation("ApplicationHost", fields: [hostId], references: [id], onDelete: Cascade)
  message          String?
  depositPaymentId String?           @unique
  depositPayment   Payment?          @relation("ApplicationDeposit", fields: [depositPaymentId], references: [id])
  status           ApplicationStatus @default(pending)
  createdAt        DateTime          @default(now())
  updatedAt        DateTime          @updatedAt

  @@index([applicantId])
  @@index([hostId, status])
}

model Inquiry {
  id        String        @id @default(uuid())
  listingId String
  listing   Listing       @relation(fields: [listingId], references: [id], onDelete: Cascade)
  seekerId  String
  seeker    User          @relation("InquirySeeker", fields: [seekerId], references: [id], onDelete: Cascade)
  hostId    String
  host      User          @relation("InquiryHost", fields: [hostId], references: [id], onDelete: Cascade)
  message   String
  status    InquiryStatus @default(open)
  createdAt DateTime      @default(now())
  updatedAt DateTime      @updatedAt

  @@index([seekerId])
  @@index([hostId, status])
}

model Viewing {
  id          String        @id @default(uuid())
  listingId   String
  listing     Listing       @relation(fields: [listingId], references: [id], onDelete: Cascade)
  requesterId String
  requester   User          @relation("ViewingRequester", fields: [requesterId], references: [id], onDelete: Cascade)
  hostId      String
  host        User          @relation("ViewingHost", fields: [hostId], references: [id], onDelete: Cascade)
  scheduledAt DateTime
  note        String?
  status      ViewingStatus @default(requested)
  createdAt   DateTime      @default(now())
  updatedAt   DateTime      @updatedAt

  @@index([requesterId])
  @@index([hostId, status])
}
```

- [ ] **Step 2: Add the back-relation fields to the existing `User`, `Listing`, and `Payment` models**

Prisma requires the inverse side of every relation. Add these lines inside the existing models (keep all current fields):

In `model User { ... }` add:
```prisma
  applications      Application[] @relation("ApplicationApplicant")
  hostedApplications Application[] @relation("ApplicationHost")
  inquiries         Inquiry[]     @relation("InquirySeeker")
  hostedInquiries   Inquiry[]     @relation("InquiryHost")
  viewings          Viewing[]     @relation("ViewingRequester")
  hostedViewings    Viewing[]     @relation("ViewingHost")
```

In `model Listing { ... }` add:
```prisma
  applications Application[]
  inquiries    Inquiry[]
  viewings     Viewing[]
```

In `model Payment { ... }` add:
```prisma
  depositApplication Application? @relation("ApplicationDeposit")
```

- [ ] **Step 3: Commit**

```bash
git add backend/prisma/schema.prisma && git commit -m "feat(backend): application, inquiry, viewing models + relations"
```

---

## Task 2: Run the migration

**Files:**
- Create: `backend/prisma/migrations/<timestamp>_rent_sale_viewings/migration.sql` (generated)

- [ ] **Step 1: Generate + apply the migration**

Run: `npm run prisma:migrate -- --name rent_sale_viewings`
Expected: migration applies; `Application`, `Inquiry`, `Viewing` tables + the three enums are created; foreign keys to `Listing`, `User`, `Payment` exist; Prisma client regenerated.

- [ ] **Step 2: Sanity-check the client types**

Run: `npx tsc --noEmit`
Expected: no type errors (the new `prisma.application`, `prisma.inquiry`, `prisma.viewing` delegates are available).

- [ ] **Step 3: Commit**

```bash
git add backend/prisma/migrations && git commit -m "feat(backend): migrate application/inquiry/viewing tables"
```

---

## Task 3: Extend the test DB reset helper + factories

**Files:**
- Modify: `backend/tests/helpers/db.ts`
- Create: `backend/tests/helpers/factories.ts`

- [ ] **Step 1: Extend `resetDb` to truncate the new tables**

In `backend/tests/helpers/db.ts`, add the three new tables to the **front** of the existing TRUNCATE list (they reference `Listing`/`User`/`Payment`, so list children first; `CASCADE` handles the rest):

```ts
import { prisma } from '../../src/lib/prisma';

export async function resetDb() {
  await prisma.$executeRawUnsafe(
    'TRUNCATE TABLE ' +
      '"Viewing","Inquiry","Application",' +
      '"Payment",' + // from Phase 4
      '"ListingPhoto","ListingRentDetails","ListingSaleDetails","ListingShortstayDetails","Listing",' +
      '"PushToken","AuthProvider","User" ' +
      'RESTART IDENTITY CASCADE',
  );
}
```

> If your Phase 4 `resetDb` already lists `Booking`/`Availability`, keep them — just ensure `"Viewing","Inquiry","Application"` appear before `"Payment"` and `"Listing"`.

- [ ] **Step 2: Create reusable seeker/lister/listing factories**

`backend/tests/helpers/factories.ts`:
```ts
import request from 'supertest';
import type { Express } from 'express';

let seq = 0;
function uniqueEmail(prefix: string) {
  seq += 1;
  return `${prefix}${seq}.${Date.now()}@x.com`;
}

export async function makeSeeker(app: Express) {
  const email = uniqueEmail('seeker');
  const reg = await request(app)
    .post('/api/v1/auth/register')
    .send({ name: 'Seeker', email, password: 'password1' });
  return { token: reg.body.accessToken as string, user: reg.body.user };
}

export async function makeLister(app: Express) {
  const email = uniqueEmail('lister');
  const reg = await request(app)
    .post('/api/v1/auth/register')
    .send({ name: 'Lister', email, password: 'password1' });
  await request(app)
    .patch('/api/v1/me/role')
    .set('Authorization', `Bearer ${reg.body.accessToken}`)
    .send({ role: 'lister', listerType: 'agent' });
  // re-login so the access token carries the lister role claim
  const login = await request(app).post('/api/v1/auth/login').send({ email, password: 'password1' });
  return { token: login.body.accessToken as string, user: login.body.user };
}

export async function makeRentListing(app: Express, token: string, overrides: Record<string, unknown> = {}) {
  const res = await request(app)
    .post('/api/v1/listings')
    .set('Authorization', `Bearer ${token}`)
    .send({
      listingType: 'rent',
      title: '2-Bed Flat',
      description: 'Lovely flat in Yaba with parking',
      propertyType: 'apartment',
      bedrooms: 2,
      bathrooms: 2,
      amenities: ['parking'],
      address: '1 Herbert Macaulay',
      city: 'Lagos',
      state: 'Lagos',
      lat: 6.5,
      lng: 3.38,
      rent: { annualRent: 1800000, securityDeposit: 300000, leaseTermMonths: 12 },
      ...overrides,
    });
  return res.body;
}

export async function makeSaleListing(app: Express, token: string, overrides: Record<string, unknown> = {}) {
  const res = await request(app)
    .post('/api/v1/listings')
    .set('Authorization', `Bearer ${token}`)
    .send({
      listingType: 'sale',
      title: '4-Bed Duplex',
      description: 'Spacious duplex for sale in Lekki',
      propertyType: 'duplex',
      bedrooms: 4,
      bathrooms: 4,
      amenities: ['parking'],
      address: '10 Admiralty Way',
      city: 'Lagos',
      state: 'Lagos',
      lat: 6.45,
      lng: 3.47,
      sale: { salePrice: 250000000, negotiable: true },
      ...overrides,
    });
  return res.body;
}
```

- [ ] **Step 3: Commit**

```bash
git add backend/tests/helpers/db.ts backend/tests/helpers/factories.ts
git commit -m "test(backend): extend resetDb + add seeker/lister/listing factories"
```

---

## Task 4: Application Zod schemas

**Files:**
- Create: `backend/src/modules/applications/applications.schemas.ts`

- [ ] **Step 1: Implement schemas**

```ts
import { z } from 'zod';

export const createApplicationSchema = z.object({
  body: z.object({
    listingId: z.string().uuid(),
    message: z.string().max(1000).optional(),
  }),
});

export const applicationIdSchema = z.object({
  params: z.object({ id: z.string().uuid() }),
});
```

- [ ] **Step 2: Commit**

```bash
git add backend/src/modules/applications/applications.schemas.ts
git commit -m "feat(backend): application zod schemas"
```

---

## Task 5: Applications service + create (Paystack deposit) + list endpoints

**Files:**
- Create: `backend/src/modules/applications/applications.service.ts`
- Create: `backend/src/modules/applications/applications.controller.ts`
- Create: `backend/src/modules/applications/applications.routes.ts`
- Modify: `backend/src/app.ts`
- Test: `backend/tests/applications.create.test.ts`

- [ ] **Step 1: Write the failing test (mock the Paystack lib)**

`backend/tests/applications.create.test.ts`:
```ts
import request from 'supertest';
import { createApp } from '../src/app';
import { prisma } from '../src/lib/prisma';
import { resetDb } from './helpers/db';
import { makeSeeker, makeLister, makeRentListing } from './helpers/factories';
import * as paystack from '../src/lib/paystack';

jest.spyOn(paystack, 'initializeTransaction').mockResolvedValue({
  authorizationUrl: 'https://checkout.paystack.com/abc123',
  accessCode: 'acc_123',
  reference: 'rentdep_test',
});

const app = createApp();
beforeEach(resetDb);
afterAll(() => prisma.$disconnect());

describe('POST /applications', () => {
  it('creates a pending application + initialized deposit payment and returns a checkout url', async () => {
    const lister = await makeLister(app);
    const listing = await makeRentListing(app, lister.token);
    const seeker = await makeSeeker(app);

    const res = await request(app)
      .post('/api/v1/applications')
      .set('Authorization', `Bearer ${seeker.token}`)
      .send({ listingId: listing.id, message: 'I would love to rent this flat.' });

    expect(res.status).toBe(201);
    expect(res.body.application.status).toBe('pending');
    expect(res.body.application.depositPaymentId).toBeTruthy();
    expect(res.body.authorizationUrl).toContain('paystack');

    const payment = await prisma.payment.findUnique({ where: { id: res.body.application.depositPaymentId } });
    expect(payment?.purpose).toBe('rent_deposit');
    expect(payment?.amount).toBe(300000); // securityDeposit kobo from the factory
    expect(payment?.status).toBe('initialized');
    expect(paystack.initializeTransaction).toHaveBeenCalledWith(
      expect.objectContaining({ amountKobo: 300000, email: seeker.user.email }),
    );
  });

  it('rejects applying to a non-rent listing (400)', async () => {
    const lister = await makeLister(app);
    // a sale listing is not eligible for rent applications
    const saleRes = await request(app)
      .post('/api/v1/listings')
      .set('Authorization', `Bearer ${lister.token}`)
      .send({
        listingType: 'sale', title: 'House', description: 'A nice house for sale', propertyType: 'house',
        bedrooms: 3, bathrooms: 2, amenities: [], address: 'x', city: 'Lagos', state: 'Lagos', lat: 6.5, lng: 3.38,
        sale: { salePrice: 50000000, negotiable: true },
      });
    const seeker = await makeSeeker(app);
    const res = await request(app)
      .post('/api/v1/applications')
      .set('Authorization', `Bearer ${seeker.token}`)
      .send({ listingId: saleRes.body.id });
    expect(res.status).toBe(400);
  });

  it('rejects applying to your own listing (400)', async () => {
    const lister = await makeLister(app);
    const listing = await makeRentListing(app, lister.token);
    const res = await request(app)
      .post('/api/v1/applications')
      .set('Authorization', `Bearer ${lister.token}`)
      .send({ listingId: listing.id });
    expect(res.status).toBe(400);
  });

  it('lists the seeker’s own applications via GET /applications', async () => {
    const lister = await makeLister(app);
    const listing = await makeRentListing(app, lister.token);
    const seeker = await makeSeeker(app);
    await request(app).post('/api/v1/applications').set('Authorization', `Bearer ${seeker.token}`).send({ listingId: listing.id });

    const res = await request(app).get('/api/v1/applications').set('Authorization', `Bearer ${seeker.token}`);
    expect(res.status).toBe(200);
    expect(res.body.items).toHaveLength(1);
    expect(res.body.items[0].listing.title).toBe('2-Bed Flat');
  });

  it('lists incoming applications for the lister via GET /me/applications', async () => {
    const lister = await makeLister(app);
    const listing = await makeRentListing(app, lister.token);
    const seeker = await makeSeeker(app);
    await request(app).post('/api/v1/applications').set('Authorization', `Bearer ${seeker.token}`).send({ listingId: listing.id });

    const res = await request(app).get('/api/v1/me/applications').set('Authorization', `Bearer ${lister.token}`);
    expect(res.status).toBe(200);
    expect(res.body.items).toHaveLength(1);
    expect(res.body.items[0].applicant.name).toBe('Seeker');
  });
});
```

- [ ] **Step 2: Run test (fails)** → `npx jest tests/applications.create.test.ts` → FAIL (module/routes missing).

- [ ] **Step 3: Implement the service**

`backend/src/modules/applications/applications.service.ts`:
```ts
import { randomUUID } from 'crypto';
import { prisma } from '../../lib/prisma';
import { ApiError } from '../../middleware/error';
import { initializeTransaction } from '../../lib/paystack';

export const applicationInclude = {
  listing: { select: { id: true, title: true, listingType: true, city: true } },
  applicant: { select: { id: true, name: true, email: true } },
  host: { select: { id: true, name: true } },
  depositPayment: true,
};

export async function createApplication(applicantId: string, listingId: string, message?: string) {
  const listing = await prisma.listing.findUnique({ where: { id: listingId }, include: { rent: true } });
  if (!listing) throw new ApiError(404, 'Listing not found');
  if (listing.listingType !== 'rent') throw new ApiError(400, 'Applications are only for rent listings');
  if (listing.ownerId === applicantId) throw new ApiError(400, 'You cannot apply to your own listing');

  const applicant = await prisma.user.findUnique({ where: { id: applicantId } });
  if (!applicant) throw new ApiError(404, 'User not found');

  const depositAmount = listing.rent?.securityDeposit ?? 0;
  const reference = `rentdep_${randomUUID()}`;

  // Create the payment + application atomically; the row exists before we hand the
  // client a checkout URL so the webhook can later mark it paid by reference.
  const application = await prisma.$transaction(async (tx) => {
    const payment = await tx.payment.create({
      data: {
        payerId: applicantId,
        payeeId: listing.ownerId,
        listingId: listing.id,
        purpose: 'rent_deposit',
        amount: depositAmount,
        currency: 'NGN',
        paystackReference: reference,
        status: 'initialized',
        escrowStatus: 'none',
      },
    });
    return tx.application.create({
      data: {
        listingId: listing.id,
        applicantId,
        hostId: listing.ownerId,
        message,
        depositPaymentId: payment.id,
        status: 'pending',
      },
      include: applicationInclude,
    });
  });

  const init = await initializeTransaction({
    email: applicant.email,
    amountKobo: depositAmount,
    reference,
    metadata: {
      purpose: 'rent_deposit',
      applicationId: application.id,
      paymentId: application.depositPaymentId,
    },
  });

  return { application, authorizationUrl: init.authorizationUrl, reference };
}

export async function myApplications(applicantId: string) {
  const items = await prisma.application.findMany({
    where: { applicantId },
    include: applicationInclude,
    orderBy: { createdAt: 'desc' },
  });
  return { items };
}

export async function hostApplications(hostId: string) {
  const items = await prisma.application.findMany({
    where: { hostId },
    include: applicationInclude,
    orderBy: { createdAt: 'desc' },
  });
  return { items };
}
```

- [ ] **Step 4: Implement the controller**

`backend/src/modules/applications/applications.controller.ts`:
```ts
import { Request, Response, NextFunction } from 'express';
import * as service from './applications.service';

export const create = (req: Request, res: Response, next: NextFunction) =>
  service
    .createApplication(req.user!.id, req.body.listingId, req.body.message)
    .then((r) => res.status(201).json(r))
    .catch(next);

export const mine = (req: Request, res: Response, next: NextFunction) =>
  service.myApplications(req.user!.id).then((r) => res.json(r)).catch(next);

export const hostList = (req: Request, res: Response, next: NextFunction) =>
  service.hostApplications(req.user!.id).then((r) => res.json(r)).catch(next);
```

- [ ] **Step 5: Implement routes**

`backend/src/modules/applications/applications.routes.ts`:
```ts
import { Router } from 'express';
import { requireAuth } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { createApplicationSchema } from './applications.schemas';
import * as c from './applications.controller';

export const applicationsRouter = Router();

applicationsRouter.post('/', requireAuth, validate(createApplicationSchema), c.create);
applicationsRouter.get('/', requireAuth, c.mine);
```

- [ ] **Step 6: Mount in `app.ts`**

Add (import `applicationsRouter`, the applications controller as `applicationsController`, and `requireAuth`/`requireLister`) before `notFound`:
```ts
app.use('/api/v1/applications', applicationsRouter);
app.get('/api/v1/me/applications', requireAuth, requireLister, applicationsController.hostList);
```

- [ ] **Step 7: Run test (passes)** → `npx jest tests/applications.create.test.ts` → PASS (5 tests).

- [ ] **Step 8: Commit**

```bash
git add backend/src/modules/applications backend/src/app.ts backend/tests/applications.create.test.ts
git commit -m "feat(backend): create rent application + paystack deposit + list endpoints"
```

---

## Task 6: Application status transitions (approve / reject / withdraw)

**Files:**
- Modify: `backend/src/modules/applications/applications.service.ts`
- Modify: `backend/src/modules/applications/applications.controller.ts`
- Modify: `backend/src/modules/applications/applications.routes.ts`
- Test: `backend/tests/applications.status.test.ts`

- [ ] **Step 1: Write the failing test**

`backend/tests/applications.status.test.ts`:
```ts
import request from 'supertest';
import { createApp } from '../src/app';
import { prisma } from '../src/lib/prisma';
import { resetDb } from './helpers/db';
import { makeSeeker, makeLister, makeRentListing } from './helpers/factories';
import * as paystack from '../src/lib/paystack';

jest.spyOn(paystack, 'initializeTransaction').mockResolvedValue({
  authorizationUrl: 'https://checkout.paystack.com/abc123',
  accessCode: 'acc_123',
  reference: 'rentdep_test',
});

const app = createApp();
beforeEach(resetDb);
afterAll(() => prisma.$disconnect());

async function seedApplication() {
  const lister = await makeLister(app);
  const listing = await makeRentListing(app, lister.token);
  const seeker = await makeSeeker(app);
  const created = await request(app)
    .post('/api/v1/applications')
    .set('Authorization', `Bearer ${seeker.token}`)
    .send({ listingId: listing.id });
  return { lister, seeker, application: created.body.application };
}

describe('application status transitions', () => {
  it('lets the host approve a pending application', async () => {
    const { lister, application } = await seedApplication();
    const res = await request(app)
      .post(`/api/v1/applications/${application.id}/approve`)
      .set('Authorization', `Bearer ${lister.token}`);
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('approved');
  });

  it('lets the host reject a pending application', async () => {
    const { lister, application } = await seedApplication();
    const res = await request(app)
      .post(`/api/v1/applications/${application.id}/reject`)
      .set('Authorization', `Bearer ${lister.token}`);
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('rejected');
  });

  it('forbids a non-host from approving (403)', async () => {
    const { seeker, application } = await seedApplication();
    const res = await request(app)
      .post(`/api/v1/applications/${application.id}/approve`)
      .set('Authorization', `Bearer ${seeker.token}`);
    expect(res.status).toBe(403);
  });

  it('lets the applicant withdraw their pending application', async () => {
    const { seeker, application } = await seedApplication();
    const res = await request(app)
      .post(`/api/v1/applications/${application.id}/withdraw`)
      .set('Authorization', `Bearer ${seeker.token}`);
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('withdrawn');
  });

  it('blocks re-approving a non-pending application (409)', async () => {
    const { lister, application } = await seedApplication();
    await request(app).post(`/api/v1/applications/${application.id}/approve`).set('Authorization', `Bearer ${lister.token}`);
    const res = await request(app)
      .post(`/api/v1/applications/${application.id}/reject`)
      .set('Authorization', `Bearer ${lister.token}`);
    expect(res.status).toBe(409);
  });
});
```

- [ ] **Step 2: Run test (fails)** → FAIL (routes missing).

- [ ] **Step 3: Append the transition functions to the service**

Append to `applications.service.ts`:
```ts
async function getOwned(id: string) {
  const application = await prisma.application.findUnique({ where: { id } });
  if (!application) throw new ApiError(404, 'Application not found');
  return application;
}

export async function decideApplication(id: string, hostId: string, status: 'approved' | 'rejected') {
  const application = await getOwned(id);
  if (application.hostId !== hostId) throw new ApiError(403, 'Not your listing');
  if (application.status !== 'pending') {
    throw new ApiError(409, `Cannot ${status === 'approved' ? 'approve' : 'reject'} an application that is ${application.status}`);
  }
  return prisma.application.update({ where: { id }, data: { status }, include: applicationInclude });
}

export async function withdrawApplication(id: string, applicantId: string) {
  const application = await getOwned(id);
  if (application.applicantId !== applicantId) throw new ApiError(403, 'Not your application');
  if (application.status !== 'pending') throw new ApiError(409, 'Only pending applications can be withdrawn');
  return prisma.application.update({ where: { id }, data: { status: 'withdrawn' }, include: applicationInclude });
}
```

- [ ] **Step 4: Append controller handlers**

Append to `applications.controller.ts`:
```ts
export const approve = (req: Request, res: Response, next: NextFunction) =>
  service.decideApplication(req.params.id, req.user!.id, 'approved').then((a) => res.json(a)).catch(next);

export const reject = (req: Request, res: Response, next: NextFunction) =>
  service.decideApplication(req.params.id, req.user!.id, 'rejected').then((a) => res.json(a)).catch(next);

export const withdraw = (req: Request, res: Response, next: NextFunction) =>
  service.withdrawApplication(req.params.id, req.user!.id).then((a) => res.json(a)).catch(next);
```

- [ ] **Step 5: Append routes**

Append to `applications.routes.ts` (import `requireLister` + `applicationIdSchema`):
```ts
import { requireLister } from '../../middleware/auth';
import { applicationIdSchema } from './applications.schemas';

applicationsRouter.post('/:id/approve', requireAuth, requireLister, validate(applicationIdSchema), c.approve);
applicationsRouter.post('/:id/reject', requireAuth, requireLister, validate(applicationIdSchema), c.reject);
applicationsRouter.post('/:id/withdraw', requireAuth, validate(applicationIdSchema), c.withdraw);
```

- [ ] **Step 6: Run test (passes)** → `npx jest tests/applications.status.test.ts` → PASS (5 tests).

- [ ] **Step 7: Commit**

```bash
git add backend/src/modules/applications backend/tests/applications.status.test.ts
git commit -m "feat(backend): application approve/reject/withdraw transitions"
```

---

## Task 7: Sale inquiries (schemas + service + endpoints + close)

**Files:**
- Create: `backend/src/modules/inquiries/inquiries.schemas.ts`
- Create: `backend/src/modules/inquiries/inquiries.service.ts`
- Create: `backend/src/modules/inquiries/inquiries.controller.ts`
- Create: `backend/src/modules/inquiries/inquiries.routes.ts`
- Modify: `backend/src/app.ts`
- Test: `backend/tests/inquiries.test.ts`

- [ ] **Step 1: Implement schemas**

`backend/src/modules/inquiries/inquiries.schemas.ts`:
```ts
import { z } from 'zod';

export const createInquirySchema = z.object({
  body: z.object({
    listingId: z.string().uuid(),
    message: z.string().min(1).max(1000),
  }),
});

export const inquiryIdSchema = z.object({
  params: z.object({ id: z.string().uuid() }),
});
```

- [ ] **Step 2: Write the failing test**

`backend/tests/inquiries.test.ts`:
```ts
import request from 'supertest';
import { createApp } from '../src/app';
import { prisma } from '../src/lib/prisma';
import { resetDb } from './helpers/db';
import { makeSeeker, makeLister, makeSaleListing } from './helpers/factories';

const app = createApp();
beforeEach(resetDb);
afterAll(() => prisma.$disconnect());

describe('sale inquiries', () => {
  it('creates an open inquiry on a sale listing', async () => {
    const lister = await makeLister(app);
    const listing = await makeSaleListing(app, lister.token);
    const seeker = await makeSeeker(app);
    const res = await request(app)
      .post('/api/v1/inquiries')
      .set('Authorization', `Bearer ${seeker.token}`)
      .send({ listingId: listing.id, message: 'Is the price negotiable?' });
    expect(res.status).toBe(201);
    expect(res.body.status).toBe('open');
    expect(res.body.message).toBe('Is the price negotiable?');
  });

  it('rejects an inquiry on a non-sale listing (400)', async () => {
    const lister = await makeLister(app);
    const rent = await request(app)
      .post('/api/v1/listings')
      .set('Authorization', `Bearer ${lister.token}`)
      .send({
        listingType: 'rent', title: 'Flat', description: 'A nice flat to rent', propertyType: 'apartment',
        bedrooms: 2, bathrooms: 1, amenities: [], address: 'x', city: 'Lagos', state: 'Lagos', lat: 6.5, lng: 3.38,
        rent: { annualRent: 1000000, securityDeposit: 0, leaseTermMonths: 12 },
      });
    const seeker = await makeSeeker(app);
    const res = await request(app)
      .post('/api/v1/inquiries')
      .set('Authorization', `Bearer ${seeker.token}`)
      .send({ listingId: rent.body.id, message: 'Hi' });
    expect(res.status).toBe(400);
  });

  it('lists the seeker’s inquiries and the lister’s incoming inquiries', async () => {
    const lister = await makeLister(app);
    const listing = await makeSaleListing(app, lister.token);
    const seeker = await makeSeeker(app);
    await request(app).post('/api/v1/inquiries').set('Authorization', `Bearer ${seeker.token}`).send({ listingId: listing.id, message: 'Hi' });

    const mine = await request(app).get('/api/v1/inquiries').set('Authorization', `Bearer ${seeker.token}`);
    expect(mine.body.items).toHaveLength(1);

    const incoming = await request(app).get('/api/v1/me/inquiries').set('Authorization', `Bearer ${lister.token}`);
    expect(incoming.body.items).toHaveLength(1);
  });

  it('lets a participant close an inquiry', async () => {
    const lister = await makeLister(app);
    const listing = await makeSaleListing(app, lister.token);
    const seeker = await makeSeeker(app);
    const created = await request(app).post('/api/v1/inquiries').set('Authorization', `Bearer ${seeker.token}`).send({ listingId: listing.id, message: 'Hi' });
    const res = await request(app)
      .post(`/api/v1/inquiries/${created.body.id}/close`)
      .set('Authorization', `Bearer ${lister.token}`);
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('closed');
  });
});
```

- [ ] **Step 3: Run test (fails)** → FAIL.

- [ ] **Step 4: Implement the service**

`backend/src/modules/inquiries/inquiries.service.ts`:
```ts
import { prisma } from '../../lib/prisma';
import { ApiError } from '../../middleware/error';

const inquiryInclude = {
  listing: { select: { id: true, title: true, listingType: true, city: true } },
  seeker: { select: { id: true, name: true } },
  host: { select: { id: true, name: true } },
};

export async function createInquiry(seekerId: string, listingId: string, message: string) {
  const listing = await prisma.listing.findUnique({ where: { id: listingId } });
  if (!listing) throw new ApiError(404, 'Listing not found');
  if (listing.listingType !== 'sale') throw new ApiError(400, 'Inquiries are only for sale listings');
  if (listing.ownerId === seekerId) throw new ApiError(400, 'You cannot inquire on your own listing');

  return prisma.inquiry.create({
    data: { listingId, seekerId, hostId: listing.ownerId, message, status: 'open' },
    include: inquiryInclude,
  });
}

export async function myInquiries(seekerId: string) {
  const items = await prisma.inquiry.findMany({
    where: { seekerId },
    include: inquiryInclude,
    orderBy: { createdAt: 'desc' },
  });
  return { items };
}

export async function hostInquiries(hostId: string) {
  const items = await prisma.inquiry.findMany({
    where: { hostId },
    include: inquiryInclude,
    orderBy: { createdAt: 'desc' },
  });
  return { items };
}

export async function closeInquiry(id: string, userId: string) {
  const inquiry = await prisma.inquiry.findUnique({ where: { id } });
  if (!inquiry) throw new ApiError(404, 'Inquiry not found');
  if (inquiry.seekerId !== userId && inquiry.hostId !== userId) throw new ApiError(403, 'Not your inquiry');
  return prisma.inquiry.update({ where: { id }, data: { status: 'closed' }, include: inquiryInclude });
}
```

- [ ] **Step 5: Implement controller + routes**

`backend/src/modules/inquiries/inquiries.controller.ts`:
```ts
import { Request, Response, NextFunction } from 'express';
import * as service from './inquiries.service';

export const create = (req: Request, res: Response, next: NextFunction) =>
  service.createInquiry(req.user!.id, req.body.listingId, req.body.message).then((i) => res.status(201).json(i)).catch(next);

export const mine = (req: Request, res: Response, next: NextFunction) =>
  service.myInquiries(req.user!.id).then((r) => res.json(r)).catch(next);

export const hostList = (req: Request, res: Response, next: NextFunction) =>
  service.hostInquiries(req.user!.id).then((r) => res.json(r)).catch(next);

export const close = (req: Request, res: Response, next: NextFunction) =>
  service.closeInquiry(req.params.id, req.user!.id).then((i) => res.json(i)).catch(next);
```

`backend/src/modules/inquiries/inquiries.routes.ts`:
```ts
import { Router } from 'express';
import { requireAuth } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { createInquirySchema, inquiryIdSchema } from './inquiries.schemas';
import * as c from './inquiries.controller';

export const inquiriesRouter = Router();

inquiriesRouter.post('/', requireAuth, validate(createInquirySchema), c.create);
inquiriesRouter.get('/', requireAuth, c.mine);
inquiriesRouter.post('/:id/close', requireAuth, validate(inquiryIdSchema), c.close);
```

- [ ] **Step 6: Mount in `app.ts`**

Add (import `inquiriesRouter` + the inquiries controller as `inquiriesController`) before `notFound`:
```ts
app.use('/api/v1/inquiries', inquiriesRouter);
app.get('/api/v1/me/inquiries', requireAuth, requireLister, inquiriesController.hostList);
```

- [ ] **Step 7: Run test (passes)** → `npx jest tests/inquiries.test.ts` → PASS (4 tests).

- [ ] **Step 8: Commit**

```bash
git add backend/src/modules/inquiries backend/src/app.ts backend/tests/inquiries.test.ts
git commit -m "feat(backend): sale inquiries (create, list, close)"
```

---

## Task 8: Viewings / inspections (schedule + transitions + list)

**Files:**
- Create: `backend/src/modules/viewings/viewings.schemas.ts`
- Create: `backend/src/modules/viewings/viewings.service.ts`
- Create: `backend/src/modules/viewings/viewings.controller.ts`
- Create: `backend/src/modules/viewings/viewings.routes.ts`
- Modify: `backend/src/app.ts`
- Test: `backend/tests/viewings.test.ts`

- [ ] **Step 1: Implement schemas**

`backend/src/modules/viewings/viewings.schemas.ts`:
```ts
import { z } from 'zod';

export const createViewingSchema = z.object({
  body: z.object({
    listingId: z.string().uuid(),
    scheduledAt: z.string().datetime(),
    note: z.string().max(500).optional(),
  }),
});

export const updateViewingSchema = z.object({
  params: z.object({ id: z.string().uuid() }),
  body: z.object({
    action: z.enum(['confirm', 'reschedule', 'cancel', 'complete']),
    scheduledAt: z.string().datetime().optional(),
  }),
});

export const listViewingsSchema = z.object({
  query: z.object({ role: z.enum(['requester', 'host']).default('requester') }),
});
```

- [ ] **Step 2: Write the failing test**

`backend/tests/viewings.test.ts`:
```ts
import request from 'supertest';
import { createApp } from '../src/app';
import { prisma } from '../src/lib/prisma';
import { resetDb } from './helpers/db';
import { makeSeeker, makeLister, makeRentListing } from './helpers/factories';

const app = createApp();
beforeEach(resetDb);
afterAll(() => prisma.$disconnect());

const SOON = new Date(Date.now() + 86_400_000).toISOString(); // tomorrow
const LATER = new Date(Date.now() + 172_800_000).toISOString(); // +2 days

async function seedViewing() {
  const lister = await makeLister(app);
  const listing = await makeRentListing(app, lister.token);
  const seeker = await makeSeeker(app);
  const created = await request(app)
    .post('/api/v1/viewings')
    .set('Authorization', `Bearer ${seeker.token}`)
    .send({ listingId: listing.id, scheduledAt: SOON, note: 'Afternoon works best' });
  return { lister, seeker, viewing: created.body };
}

describe('viewings', () => {
  it('schedules a viewing in the requested state', async () => {
    const { viewing } = await seedViewing();
    expect(viewing.status).toBe('requested');
    expect(viewing.requester.name).toBe('Seeker');
  });

  it('lets the host confirm a requested viewing', async () => {
    const { lister, viewing } = await seedViewing();
    const res = await request(app)
      .patch(`/api/v1/viewings/${viewing.id}`)
      .set('Authorization', `Bearer ${lister.token}`)
      .send({ action: 'confirm' });
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('confirmed');
  });

  it('lets a participant reschedule with a new time', async () => {
    const { seeker, viewing } = await seedViewing();
    const res = await request(app)
      .patch(`/api/v1/viewings/${viewing.id}`)
      .set('Authorization', `Bearer ${seeker.token}`)
      .send({ action: 'reschedule', scheduledAt: LATER });
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('rescheduled');
    expect(new Date(res.body.scheduledAt).toISOString()).toBe(LATER);
  });

  it('requires scheduledAt when rescheduling (400)', async () => {
    const { seeker, viewing } = await seedViewing();
    const res = await request(app)
      .patch(`/api/v1/viewings/${viewing.id}`)
      .set('Authorization', `Bearer ${seeker.token}`)
      .send({ action: 'reschedule' });
    expect(res.status).toBe(400);
  });

  it('forbids an unrelated user from updating (403)', async () => {
    const { viewing } = await seedViewing();
    const stranger = await makeSeeker(app);
    const res = await request(app)
      .patch(`/api/v1/viewings/${viewing.id}`)
      .set('Authorization', `Bearer ${stranger.token}`)
      .send({ action: 'cancel' });
    expect(res.status).toBe(403);
  });

  it('lists viewings as requester and as host', async () => {
    const { lister, seeker } = await seedViewing();
    const asRequester = await request(app).get('/api/v1/viewings?role=requester').set('Authorization', `Bearer ${seeker.token}`);
    expect(asRequester.body.items).toHaveLength(1);
    const asHost = await request(app).get('/api/v1/viewings?role=host').set('Authorization', `Bearer ${lister.token}`);
    expect(asHost.body.items).toHaveLength(1);
  });
});
```

- [ ] **Step 3: Run test (fails)** → FAIL.

- [ ] **Step 4: Implement the service**

`backend/src/modules/viewings/viewings.service.ts`:
```ts
import { prisma } from '../../lib/prisma';
import { ApiError } from '../../middleware/error';

const viewingInclude = {
  listing: { select: { id: true, title: true, listingType: true, city: true } },
  requester: { select: { id: true, name: true } },
  host: { select: { id: true, name: true } },
};

const ACTIVE: ReadonlyArray<string> = ['requested', 'confirmed', 'rescheduled'];

export async function createViewing(requesterId: string, listingId: string, scheduledAt: string, note?: string) {
  const listing = await prisma.listing.findUnique({ where: { id: listingId } });
  if (!listing) throw new ApiError(404, 'Listing not found');
  if (listing.listingType === 'shortstay') throw new ApiError(400, 'Viewings apply to rent and sale listings only');
  if (listing.ownerId === requesterId) throw new ApiError(400, 'You cannot request a viewing of your own listing');

  return prisma.viewing.create({
    data: { listingId, requesterId, hostId: listing.ownerId, scheduledAt: new Date(scheduledAt), note, status: 'requested' },
    include: viewingInclude,
  });
}

export async function updateViewing(
  id: string,
  userId: string,
  action: 'confirm' | 'reschedule' | 'cancel' | 'complete',
  scheduledAt?: string,
) {
  const viewing = await prisma.viewing.findUnique({ where: { id } });
  if (!viewing) throw new ApiError(404, 'Viewing not found');

  const isHost = viewing.hostId === userId;
  const isRequester = viewing.requesterId === userId;
  if (!isHost && !isRequester) throw new ApiError(403, 'Not your viewing');

  if (!ACTIVE.includes(viewing.status)) {
    throw new ApiError(409, `Cannot ${action} a viewing that is ${viewing.status}`);
  }

  switch (action) {
    case 'confirm': {
      if (!isHost) throw new ApiError(403, 'Only the host can confirm a viewing');
      return prisma.viewing.update({ where: { id }, data: { status: 'confirmed' }, include: viewingInclude });
    }
    case 'reschedule': {
      if (!scheduledAt) throw new ApiError(400, 'scheduledAt is required to reschedule');
      return prisma.viewing.update({
        where: { id },
        data: { status: 'rescheduled', scheduledAt: new Date(scheduledAt) },
        include: viewingInclude,
      });
    }
    case 'cancel': {
      return prisma.viewing.update({ where: { id }, data: { status: 'cancelled' }, include: viewingInclude });
    }
    case 'complete': {
      if (!isHost) throw new ApiError(403, 'Only the host can complete a viewing');
      return prisma.viewing.update({ where: { id }, data: { status: 'completed' }, include: viewingInclude });
    }
    default:
      throw new ApiError(400, 'Unknown action');
  }
}

export async function listViewings(userId: string, role: 'requester' | 'host') {
  const where = role === 'host' ? { hostId: userId } : { requesterId: userId };
  const items = await prisma.viewing.findMany({ where, include: viewingInclude, orderBy: { scheduledAt: 'asc' } });
  return { items };
}
```

- [ ] **Step 5: Implement controller + routes**

`backend/src/modules/viewings/viewings.controller.ts`:
```ts
import { Request, Response, NextFunction } from 'express';
import * as service from './viewings.service';

export const create = (req: Request, res: Response, next: NextFunction) =>
  service
    .createViewing(req.user!.id, req.body.listingId, req.body.scheduledAt, req.body.note)
    .then((v) => res.status(201).json(v))
    .catch(next);

export const update = (req: Request, res: Response, next: NextFunction) =>
  service
    .updateViewing(req.params.id, req.user!.id, req.body.action, req.body.scheduledAt)
    .then((v) => res.json(v))
    .catch(next);

export const list = (req: Request, res: Response, next: NextFunction) =>
  service.listViewings(req.user!.id, (req.query.role as 'requester' | 'host') ?? 'requester').then((r) => res.json(r)).catch(next);
```

`backend/src/modules/viewings/viewings.routes.ts`:
```ts
import { Router } from 'express';
import { requireAuth } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { createViewingSchema, updateViewingSchema, listViewingsSchema } from './viewings.schemas';
import * as c from './viewings.controller';

export const viewingsRouter = Router();

viewingsRouter.post('/', requireAuth, validate(createViewingSchema), c.create);
viewingsRouter.patch('/:id', requireAuth, validate(updateViewingSchema), c.update);
viewingsRouter.get('/', requireAuth, validate(listViewingsSchema), c.list);
```

- [ ] **Step 6: Mount in `app.ts`**

Add (import `viewingsRouter`) before `notFound`:
```ts
app.use('/api/v1/viewings', viewingsRouter);
```

- [ ] **Step 7: Run test (passes)** → `npx jest tests/viewings.test.ts` → PASS (6 tests).

- [ ] **Step 8: Commit**

```bash
git add backend/src/modules/viewings backend/src/app.ts backend/tests/viewings.test.ts
git commit -m "feat(backend): viewings schedule + confirm/reschedule/cancel/complete"
```

---

## Task 9: Full suite green

- [ ] **Step 1: Run everything** → `npx jest` → all PASS (Phases 0–5 suites).
- [ ] **Step 2: Type-check** → `npx tsc --noEmit` → no errors.
- [ ] **Step 3: Commit any cleanups**

```bash
git add -A && git commit -m "test(backend): phase 5 rent/sale/viewings suite green" || echo "nothing to commit"
```

---

## Self-Review (against spec §5.3, §6 models, §8 Rent & sale endpoints, §9.2)

- **`applications` model (rent; deposit_payment_id → payments; status pending|approved|rejected|withdrawn):** Task 1. ✓
- **`inquiries` model (sale; status open|closed):** Task 1. ✓
- **`viewings` model (rent & sale; requested|confirmed|rescheduled|cancelled|completed):** Task 1. ✓
- **Migration + extended `resetDb`:** Tasks 2, 3. ✓
- **POST /applications (create + initialize Paystack deposit via the Phase 4 lib):** Task 5 (`initializeTransaction`, `Payment(purpose=rent_deposit)` created in a transaction, returns `authorizationUrl`). ✓
- **GET /applications (mine as seeker), GET /me/applications (lister view):** Task 5. ✓
- **Status transitions approve/reject/withdraw:** Task 6 (host-only decide, applicant-only withdraw, pending-guard 409). ✓
- **POST /inquiries, GET /inquiries (+ close), GET /me/inquiries:** Task 7. ✓
- **POST /viewings (schedule), PATCH /viewings/:id (confirm/reschedule/cancel/complete), GET /viewings:** Task 8. ✓
- **Ownership/role checks + Zod validation:** every mutating route uses `requireAuth` (+ `requireLister` on lister-only routes), services assert `hostId`/`applicantId`/participant membership, and inputs flow through `validate(schema)`. ✓
- **Supertest tests for application creation + status transition + viewing scheduling:** Tasks 5, 6, 8 (plus inquiries in Task 7). ✓

**Type consistency:** `applicationInclude`/`inquiryInclude`/`viewingInclude` are defined once per module and reused across service responses, controllers, and tests; the `ApplicationStatus`/`InquiryStatus`/`ViewingStatus` enums match the spec; the create-application response shape `{ application, authorizationUrl, reference }` is the contract consumed by the Phase 5 frontend `useCreateApplication` hook; `initializeTransaction({ email, amountKobo, reference, metadata })` matches the Phase 4 lib signature.

**No placeholders:** every code step is complete and runnable. The only assumptions are the explicitly-documented Phase 4 deliverables (`src/lib/paystack.ts` and the `Payment` model), which this phase reuses rather than redefines.
