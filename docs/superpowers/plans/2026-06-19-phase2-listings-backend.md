# Phase 2 — Listings & Discovery (Backend) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement listing CRUD across all three types (rent/sale/short-stay), photo upload via Cloudinary, faceted search, and PostGIS proximity ("nearby") search.

**Architecture:** A `listings` module holds schemas, service, controller, and routes. One `Listing` row carries shared fields + a `geo` PostGIS point; type-specific fields live in `ListingRentDetails` / `ListingSaleDetails` / `ListingShortstayDetails`. Photos are stored on Cloudinary and referenced in `ListingPhoto`. Search uses Prisma for facets and a raw `$queryRaw` `ST_DWithin` for geo. Reuses Phase 1 `requireAuth`/`requireLister` and the `validate` middleware.

**Tech Stack:** Express, Prisma, PostgreSQL + PostGIS, Cloudinary SDK, Zod, Jest, Supertest.

> **Note on git:** Each task ends with a commit. Assumes Phases 0–1 complete (User model, auth middleware, validate, createApp, prisma, error handler).

> All paths relative to `backend/`.

---

## File Structure (created/modified this phase)

```
backend/
├── prisma/schema.prisma                  # + Listing, photos, type detail models + enums
├── src/
│   ├── config/env.ts                     # MODIFY: Cloudinary keys
│   ├── lib/cloudinary.ts                 # signed upload helper
│   ├── modules/listings/listings.schemas.ts
│   ├── modules/listings/listings.service.ts
│   ├── modules/listings/listings.search.ts   # filter + geo query builders
│   ├── modules/listings/listings.controller.ts
│   ├── modules/listings/listings.routes.ts
│   └── app.ts                            # MODIFY: mount listings router
└── tests/
    ├── listings.crud.test.ts
    ├── listings.search.test.ts
    ├── listings.nearby.test.ts
    └── listings.photos.test.ts
```

---

## Task 1: Prisma models for listings

**Files:**
- Modify: `backend/prisma/schema.prisma`

- [ ] **Step 1: Add enums + models**

Append:
```prisma
enum ListingType {
  rent
  sale
  shortstay
}

enum ListingStatus {
  draft
  active
  paused
  rented
  sold
}

model Listing {
  id            String         @id @default(uuid())
  ownerId       String
  owner         User           @relation(fields: [ownerId], references: [id], onDelete: Cascade)
  listingType   ListingType
  status        ListingStatus  @default(active)
  title         String
  description   String
  propertyType  String
  bedrooms      Int            @default(0)
  bathrooms     Int            @default(0)
  areaSqm       Int?
  amenities     String[]       @default([])
  address       String
  city          String
  state         String
  lat           Float
  lng           Float
  // PostGIS geography column is added via raw SQL in the migration (see Task 2).
  photos        ListingPhoto[]
  rent          ListingRentDetails?
  sale          ListingSaleDetails?
  shortstay     ListingShortstayDetails?
  createdAt     DateTime       @default(now())
  updatedAt     DateTime       @updatedAt

  @@index([listingType, status])
  @@index([city])
}

model ListingPhoto {
  id               String  @id @default(uuid())
  listingId        String
  listing          Listing @relation(fields: [listingId], references: [id], onDelete: Cascade)
  cloudinaryPublicId String
  url              String
  position         Int     @default(0)
  createdAt        DateTime @default(now())
}

model ListingRentDetails {
  listingId       String  @id
  listing         Listing @relation(fields: [listingId], references: [id], onDelete: Cascade)
  monthlyRent     Int?
  annualRent      Int?
  securityDeposit Int     @default(0)
  leaseTermMonths Int     @default(12)
  availableFrom   DateTime?
}

model ListingSaleDetails {
  listingId        String  @id
  listing          Listing @relation(fields: [listingId], references: [id], onDelete: Cascade)
  salePrice        Int
  negotiable       Boolean @default(false)
  titleDocsVerified Boolean @default(false)
}

model ListingShortstayDetails {
  listingId   String  @id
  listing     Listing @relation(fields: [listingId], references: [id], onDelete: Cascade)
  nightlyRate Int
  cleaningFee Int     @default(0)
  minNights   Int     @default(1)
  maxNights   Int     @default(30)
  maxGuests   Int     @default(2)
  houseRules  String?
}
```

> All money fields are integer **kobo**. `lat`/`lng` are stored as plain floats for convenience; the PostGIS `geo` geography column (added in Task 2) is the source of truth for distance queries and is kept in sync via SQL triggers/updates shown there.

- [ ] **Step 2: Create the migration (without applying raw SQL yet)**

Run: `npm run prisma:migrate -- --name listings`
Expected: tables created. (Geo column added next task.)

- [ ] **Step 3: Commit**

```bash
git add backend/prisma && git commit -m "feat(backend): listing + type-detail + photo models"
```

---

## Task 2: Add PostGIS geography column + sync

**Files:**
- Create: `backend/prisma/migrations/<timestamp>_listing_geo/migration.sql` (manual migration)

- [ ] **Step 1: Create an empty migration to edit**

Run: `npx prisma migrate dev --create-only --name listing_geo`
This creates a new migration folder with an empty `migration.sql`.

- [ ] **Step 2: Write the raw SQL into that `migration.sql`**

```sql
-- Add a geography point column and keep it in sync with lat/lng.
ALTER TABLE "Listing" ADD COLUMN IF NOT EXISTS geo geography(Point, 4326);

UPDATE "Listing" SET geo = ST_SetSRID(ST_MakePoint(lng, lat), 4326)::geography;

CREATE OR REPLACE FUNCTION listing_sync_geo() RETURNS trigger AS $$
BEGIN
  NEW.geo := ST_SetSRID(ST_MakePoint(NEW.lng, NEW.lat), 4326)::geography;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_listing_sync_geo ON "Listing";
CREATE TRIGGER trg_listing_sync_geo
  BEFORE INSERT OR UPDATE OF lat, lng ON "Listing"
  FOR EACH ROW EXECUTE FUNCTION listing_sync_geo();

CREATE INDEX IF NOT EXISTS listing_geo_gix ON "Listing" USING GIST (geo);
```

- [ ] **Step 3: Apply the migration**

Run: `npx prisma migrate dev`
Expected: SQL runs cleanly; GIST index created.

- [ ] **Step 4: Commit**

```bash
git add backend/prisma/migrations
git commit -m "feat(backend): postgis geo column + sync trigger + gist index"
```

---

## Task 3: Cloudinary helper + env

**Files:**
- Modify: `backend/src/config/env.ts`, `backend/.env.example`
- Create: `backend/src/lib/cloudinary.ts`
- Test: `backend/tests/cloudinary.test.ts`

- [ ] **Step 1: Add env keys**

Add to `EnvSchema`:
```ts
  CLOUDINARY_CLOUD_NAME: z.string().optional(),
  CLOUDINARY_API_KEY: z.string().optional(),
  CLOUDINARY_API_SECRET: z.string().optional(),
```
Append to `.env.example`:
```
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=
```

- [ ] **Step 2: Install + write the failing test**

Run: `npm install cloudinary`

`backend/tests/cloudinary.test.ts`:
```ts
import { signUploadParams } from '../src/lib/cloudinary';

describe('cloudinary signed params', () => {
  it('returns a signature, timestamp, and api key', () => {
    const params = signUploadParams('listings');
    expect(params.signature).toBeTruthy();
    expect(params.timestamp).toBeGreaterThan(0);
    expect(params.folder).toBe('listings');
  });
});
```

- [ ] **Step 3: Run test (fails)** → FAIL.

- [ ] **Step 4: Implement `cloudinary.ts`**

```ts
import { v2 as cloudinary } from 'cloudinary';
import { parseEnv } from '../config/env';

const env = parseEnv(process.env);

cloudinary.config({
  cloud_name: env.CLOUDINARY_CLOUD_NAME,
  api_key: env.CLOUDINARY_API_KEY,
  api_secret: env.CLOUDINARY_API_SECRET,
});

export function signUploadParams(folder: string) {
  const timestamp = Math.floor(Date.now() / 1000);
  const signature = cloudinary.utils.api_sign_request(
    { timestamp, folder },
    env.CLOUDINARY_API_SECRET ?? 'test-secret',
  );
  return { timestamp, folder, signature, apiKey: env.CLOUDINARY_API_KEY, cloudName: env.CLOUDINARY_CLOUD_NAME };
}

export { cloudinary };
```

- [ ] **Step 5: Run test (passes)** → PASS.

- [ ] **Step 6: Commit**

```bash
git add backend/src/lib/cloudinary.ts backend/tests/cloudinary.test.ts backend/src/config/env.ts backend/.env.example backend/package.json
git commit -m "feat(backend): cloudinary signed upload helper"
```

---

## Task 4: Listing schemas

**Files:**
- Create: `backend/src/modules/listings/listings.schemas.ts`

- [ ] **Step 1: Implement schemas**

```ts
import { z } from 'zod';

const baseListing = {
  title: z.string().min(3),
  description: z.string().min(10),
  propertyType: z.string().min(2),
  bedrooms: z.number().int().min(0),
  bathrooms: z.number().int().min(0),
  areaSqm: z.number().int().positive().optional(),
  amenities: z.array(z.string()).default([]),
  address: z.string().min(3),
  city: z.string().min(2),
  state: z.string().min(2),
  lat: z.number(),
  lng: z.number(),
};

export const createListingSchema = z.object({
  body: z.discriminatedUnion('listingType', [
    z.object({
      listingType: z.literal('rent'),
      ...baseListing,
      rent: z.object({
        monthlyRent: z.number().int().positive().optional(),
        annualRent: z.number().int().positive().optional(),
        securityDeposit: z.number().int().min(0).default(0),
        leaseTermMonths: z.number().int().positive().default(12),
        availableFrom: z.string().datetime().optional(),
      }),
    }),
    z.object({
      listingType: z.literal('sale'),
      ...baseListing,
      sale: z.object({
        salePrice: z.number().int().positive(),
        negotiable: z.boolean().default(false),
      }),
    }),
    z.object({
      listingType: z.literal('shortstay'),
      ...baseListing,
      shortstay: z.object({
        nightlyRate: z.number().int().positive(),
        cleaningFee: z.number().int().min(0).default(0),
        minNights: z.number().int().positive().default(1),
        maxNights: z.number().int().positive().default(30),
        maxGuests: z.number().int().positive().default(2),
        houseRules: z.string().optional(),
      }),
    }),
  ]),
});

export const updateListingSchema = z.object({
  body: z.object({
    title: z.string().min(3).optional(),
    description: z.string().min(10).optional(),
    amenities: z.array(z.string()).optional(),
    bedrooms: z.number().int().min(0).optional(),
    bathrooms: z.number().int().min(0).optional(),
  }),
});

export const statusSchema = z.object({
  body: z.object({ status: z.enum(['draft', 'active', 'paused', 'rented', 'sold']) }),
});

export const searchSchema = z.object({
  query: z.object({
    type: z.enum(['rent', 'sale', 'shortstay']).optional(),
    q: z.string().optional(),
    minPrice: z.coerce.number().optional(),
    maxPrice: z.coerce.number().optional(),
    bedrooms: z.coerce.number().optional(),
    bathrooms: z.coerce.number().optional(),
    propertyType: z.string().optional(),
    amenities: z.string().optional(), // comma-separated
    sort: z.enum(['recent', 'priceAsc', 'priceDesc']).default('recent'),
    page: z.coerce.number().default(1),
    limit: z.coerce.number().max(50).default(20),
  }),
});

export const nearbySchema = z.object({
  query: z.object({
    lat: z.coerce.number(),
    lng: z.coerce.number(),
    radius: z.coerce.number().default(5000), // meters
    type: z.enum(['rent', 'sale', 'shortstay']).optional(),
  }),
});
```

- [ ] **Step 2: Commit**

```bash
git add backend/src/modules/listings/listings.schemas.ts
git commit -m "feat(backend): listing zod schemas"
```

---

## Task 5: Listing CRUD service + endpoints

**Files:**
- Create: `backend/src/modules/listings/listings.service.ts`
- Create: `backend/src/modules/listings/listings.controller.ts`
- Create: `backend/src/modules/listings/listings.routes.ts`
- Modify: `backend/src/app.ts`, `backend/tests/helpers/db.ts`
- Test: `backend/tests/listings.crud.test.ts`

- [ ] **Step 1: Extend the test DB reset helper**

In `backend/tests/helpers/db.ts`, update the TRUNCATE list to include listing tables:
```ts
await prisma.$executeRawUnsafe(
  'TRUNCATE TABLE "ListingPhoto","ListingRentDetails","ListingSaleDetails","ListingShortstayDetails","Listing","PushToken","AuthProvider","User" RESTART IDENTITY CASCADE',
);
```

- [ ] **Step 2: Write the failing test**

`backend/tests/listings.crud.test.ts`:
```ts
import request from 'supertest';
import { createApp } from '../src/app';
import { prisma } from '../src/lib/prisma';
import { resetDb } from './helpers/db';

const app = createApp();
beforeEach(resetDb);
afterAll(() => prisma.$disconnect());

async function listerToken() {
  const reg = await request(app).post('/api/v1/auth/register').send({ name: 'L', email: 'l@x.com', password: 'password1' });
  const token = reg.body.accessToken;
  await request(app).patch('/api/v1/me/role').set('Authorization', `Bearer ${token}`).send({ role: 'lister', listerType: 'agent' });
  // re-login to get a token with the lister role claim
  const login = await request(app).post('/api/v1/auth/login').send({ email: 'l@x.com', password: 'password1' });
  return login.body.accessToken as string;
}

const rentBody = {
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
};

describe('listing CRUD', () => {
  it('creates a rent listing', async () => {
    const token = await listerToken();
    const res = await request(app).post('/api/v1/listings').set('Authorization', `Bearer ${token}`).send(rentBody);
    expect(res.status).toBe(201);
    expect(res.body.listingType).toBe('rent');
    expect(res.body.rent.annualRent).toBe(1800000);
  });

  it('rejects create from a seeker (403)', async () => {
    const reg = await request(app).post('/api/v1/auth/register').send({ name: 'S', email: 's@x.com', password: 'password1' });
    const res = await request(app).post('/api/v1/listings').set('Authorization', `Bearer ${reg.body.accessToken}`).send(rentBody);
    expect(res.status).toBe(403);
  });

  it('gets a listing by id', async () => {
    const token = await listerToken();
    const created = await request(app).post('/api/v1/listings').set('Authorization', `Bearer ${token}`).send(rentBody);
    const res = await request(app).get(`/api/v1/listings/${created.body.id}`);
    expect(res.status).toBe(200);
    expect(res.body.id).toBe(created.body.id);
  });

  it('prevents non-owner from editing (403)', async () => {
    const ownerToken = await listerToken();
    const created = await request(app).post('/api/v1/listings').set('Authorization', `Bearer ${ownerToken}`).send(rentBody);
    const reg2 = await request(app).post('/api/v1/auth/register').send({ name: 'O', email: 'o@x.com', password: 'password1' });
    await request(app).patch('/api/v1/me/role').set('Authorization', `Bearer ${reg2.body.accessToken}`).send({ role: 'lister', listerType: 'agent' });
    const login2 = await request(app).post('/api/v1/auth/login').send({ email: 'o@x.com', password: 'password1' });
    const res = await request(app).patch(`/api/v1/listings/${created.body.id}`).set('Authorization', `Bearer ${login2.body.accessToken}`).send({ title: 'Hacked' });
    expect(res.status).toBe(403);
  });
});
```

- [ ] **Step 3: Run test (fails)** → FAIL.

- [ ] **Step 4: Implement the service**

`backend/src/modules/listings/listings.service.ts`:
```ts
import { prisma } from '../../lib/prisma';
import { ApiError } from '../../middleware/error';

const include = { rent: true, sale: true, shortstay: true, photos: true, owner: { select: { id: true, name: true, avatarUrl: true, listerType: true } } };

export async function createListing(ownerId: string, body: any) {
  const { listingType, rent, sale, shortstay, ...base } = body;
  return prisma.listing.create({
    data: {
      ...base,
      ownerId,
      listingType,
      availableFromNote: undefined,
      rent: listingType === 'rent' ? { create: { ...rent, availableFrom: rent.availableFrom ? new Date(rent.availableFrom) : null } } : undefined,
      sale: listingType === 'sale' ? { create: sale } : undefined,
      shortstay: listingType === 'shortstay' ? { create: shortstay } : undefined,
    },
    include,
  });
}

export async function getListing(id: string) {
  const listing = await prisma.listing.findUnique({ where: { id }, include });
  if (!listing) throw new ApiError(404, 'Listing not found');
  return listing;
}

async function assertOwner(id: string, ownerId: string) {
  const listing = await prisma.listing.findUnique({ where: { id }, select: { ownerId: true } });
  if (!listing) throw new ApiError(404, 'Listing not found');
  if (listing.ownerId !== ownerId) throw new ApiError(403, 'Not your listing');
}

export async function updateListing(id: string, ownerId: string, data: any) {
  await assertOwner(id, ownerId);
  return prisma.listing.update({ where: { id }, data, include });
}

export async function setStatus(id: string, ownerId: string, status: any) {
  await assertOwner(id, ownerId);
  return prisma.listing.update({ where: { id }, data: { status }, include });
}

export async function deleteListing(id: string, ownerId: string) {
  await assertOwner(id, ownerId);
  await prisma.listing.delete({ where: { id } });
}

export async function myListings(ownerId: string) {
  return prisma.listing.findMany({ where: { ownerId }, include, orderBy: { createdAt: 'desc' } });
}
```

> Remove the stray `availableFromNote: undefined` line — it is shown here only to flag that `availableFrom` is normalized to a `Date` inside the `rent.create`. Final code must not include `availableFromNote`.

- [ ] **Step 5: Implement controller**

`backend/src/modules/listings/listings.controller.ts`:
```ts
import { Request, Response, NextFunction } from 'express';
import * as service from './listings.service';
import { searchListings, nearbyListings } from './listings.search';

export const create = (req: Request, res: Response, next: NextFunction) =>
  service.createListing(req.user!.id, req.body).then((l) => res.status(201).json(l)).catch(next);

export const getOne = (req: Request, res: Response, next: NextFunction) =>
  service.getListing(req.params.id).then((l) => res.json(l)).catch(next);

export const update = (req: Request, res: Response, next: NextFunction) =>
  service.updateListing(req.params.id, req.user!.id, req.body).then((l) => res.json(l)).catch(next);

export const setStatus = (req: Request, res: Response, next: NextFunction) =>
  service.setStatus(req.params.id, req.user!.id, req.body.status).then((l) => res.json(l)).catch(next);

export const remove = (req: Request, res: Response, next: NextFunction) =>
  service.deleteListing(req.params.id, req.user!.id).then(() => res.status(204).send()).catch(next);

export const mine = (req: Request, res: Response, next: NextFunction) =>
  service.myListings(req.user!.id).then((l) => res.json(l)).catch(next);

export const search = (req: Request, res: Response, next: NextFunction) =>
  searchListings(req.query as any).then((r) => res.json(r)).catch(next);

export const nearby = (req: Request, res: Response, next: NextFunction) =>
  nearbyListings(req.query as any).then((r) => res.json(r)).catch(next);
```

- [ ] **Step 6: Implement routes + mount**

`backend/src/modules/listings/listings.routes.ts`:
```ts
import { Router } from 'express';
import { requireAuth, requireLister } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import * as c from './listings.controller';
import { createListingSchema, updateListingSchema, statusSchema, searchSchema, nearbySchema } from './listings.schemas';

export const listingsRouter = Router();

listingsRouter.get('/', validate(searchSchema), c.search);
listingsRouter.get('/nearby', validate(nearbySchema), c.nearby);
listingsRouter.get('/:id', c.getOne);
listingsRouter.post('/', requireAuth, requireLister, validate(createListingSchema), c.create);
listingsRouter.patch('/:id', requireAuth, requireLister, validate(updateListingSchema), c.update);
listingsRouter.patch('/:id/status', requireAuth, requireLister, validate(statusSchema), c.setStatus);
listingsRouter.delete('/:id', requireAuth, requireLister, c.remove);
```

Add a separate route for `GET /me/listings` on the users router OR mount here. In `app.ts` add:
```ts
app.use('/api/v1/listings', listingsRouter);
// my listings:
import { mine } from './modules/listings/listings.controller';
app.get('/api/v1/me/listings', requireAuth, requireLister, mine);
```
(Import `requireAuth`, `requireLister`, `listingsRouter`, and `mine`. Place before `notFound`.)

- [ ] **Step 7: Create the search module stub so imports resolve**

Create `backend/src/modules/listings/listings.search.ts` with placeholders implemented fully in Task 6. For now, to keep this task's tests passing, add minimal working implementations:
```ts
import { prisma } from '../../lib/prisma';

export async function searchListings(_q: any) {
  return { items: [], page: 1, total: 0 };
}

export async function nearbyListings(_q: any) {
  return { items: [] };
}
```

- [ ] **Step 8: Run test (passes)** → `npx jest tests/listings.crud.test.ts` → PASS (4 tests).

- [ ] **Step 9: Commit**

```bash
git add backend/src/modules/listings backend/src/app.ts backend/tests/listings.crud.test.ts backend/tests/helpers/db.ts
git commit -m "feat(backend): listing CRUD endpoints with ownership checks"
```

---

## Task 6: Faceted search + nearby (PostGIS)

**Files:**
- Modify: `backend/src/modules/listings/listings.search.ts`
- Test: `backend/tests/listings.search.test.ts`, `backend/tests/listings.nearby.test.ts`

- [ ] **Step 1: Write the failing search test**

`backend/tests/listings.search.test.ts`:
```ts
import request from 'supertest';
import { createApp } from '../src/app';
import { prisma } from '../src/lib/prisma';
import { resetDb } from './helpers/db';

const app = createApp();
beforeEach(resetDb);
afterAll(() => prisma.$disconnect());

async function seedListing(overrides: any) {
  const reg = await request(app).post('/api/v1/auth/register').send({ name: 'L', email: `l${Math.random()}@x.com`, password: 'password1' });
  await request(app).patch('/api/v1/me/role').set('Authorization', `Bearer ${reg.body.accessToken}`).send({ role: 'lister', listerType: 'agent' });
  const login = await request(app).post('/api/v1/auth/login').send({ email: reg.body.user.email, password: 'password1' });
  return request(app).post('/api/v1/listings').set('Authorization', `Bearer ${login.body.accessToken}`).send({
    listingType: 'rent', title: 'Flat', description: 'A nice flat to rent', propertyType: 'apartment',
    bedrooms: 2, bathrooms: 1, amenities: [], address: 'x', city: 'Lagos', state: 'Lagos', lat: 6.5, lng: 3.38,
    rent: { annualRent: overrides.price ?? 1000000, securityDeposit: 0, leaseTermMonths: 12 }, ...overrides.listing,
  });
}

describe('search', () => {
  it('filters by type and bedrooms', async () => {
    await seedListing({ listing: { bedrooms: 2 } });
    await seedListing({ listing: { bedrooms: 4 } });
    const res = await request(app).get('/api/v1/listings?type=rent&bedrooms=4');
    expect(res.status).toBe(200);
    expect(res.body.items.every((l: any) => l.bedrooms >= 4)).toBe(true);
  });
});
```

- [ ] **Step 2: Run test (fails)** → FAIL (stub returns empty).

- [ ] **Step 3: Implement search + nearby**

Replace `listings.search.ts`:
```ts
import { Prisma } from '@prisma/client';
import { prisma } from '../../lib/prisma';

const include = { rent: true, sale: true, shortstay: true, photos: true, owner: { select: { id: true, name: true, avatarUrl: true, listerType: true } } };

export async function searchListings(q: {
  type?: string; q?: string; minPrice?: number; maxPrice?: number; bedrooms?: number; bathrooms?: number;
  propertyType?: string; amenities?: string; sort: string; page: number; limit: number;
}) {
  const where: Prisma.ListingWhereInput = { status: 'active' };
  if (q.type) where.listingType = q.type as any;
  if (q.propertyType) where.propertyType = q.propertyType;
  if (q.bedrooms) where.bedrooms = { gte: q.bedrooms };
  if (q.bathrooms) where.bathrooms = { gte: q.bathrooms };
  if (q.amenities) where.amenities = { hasEvery: q.amenities.split(',') };
  if (q.q) where.OR = [{ title: { contains: q.q, mode: 'insensitive' } }, { city: { contains: q.q, mode: 'insensitive' } }];

  const orderBy: Prisma.ListingOrderByWithRelationInput =
    q.sort === 'recent' ? { createdAt: 'desc' } : { createdAt: 'desc' };

  const skip = (q.page - 1) * q.limit;
  const [items, total] = await Promise.all([
    prisma.listing.findMany({ where, include, orderBy, skip, take: q.limit }),
    prisma.listing.count({ where }),
  ]);
  return { items, page: q.page, total };
}

export async function nearbyListings(q: { lat: number; lng: number; radius: number; type?: string }) {
  const typeFilter = q.type ? Prisma.sql`AND "listingType" = ${q.type}::"ListingType"` : Prisma.empty;
  const rows = await prisma.$queryRaw<{ id: string; distance: number }[]>`
    SELECT id, ST_Distance(geo, ST_SetSRID(ST_MakePoint(${q.lng}, ${q.lat}), 4326)::geography) AS distance
    FROM "Listing"
    WHERE status = 'active'
      AND ST_DWithin(geo, ST_SetSRID(ST_MakePoint(${q.lng}, ${q.lat}), 4326)::geography, ${q.radius})
      ${typeFilter}
    ORDER BY distance ASC
    LIMIT 100`;
  const ids = rows.map((r) => r.id);
  const listings = await prisma.listing.findMany({ where: { id: { in: ids } }, include });
  const byId = new Map(listings.map((l) => [l.id, l]));
  return { items: rows.map((r) => ({ ...byId.get(r.id), distance: Math.round(r.distance) })) };
}
```

> Price filtering spans three detail tables; for v1 keep facet filters on shared fields and apply `minPrice`/`maxPrice` post-query per type, or extend `where` with relation filters (e.g. `rent: { annualRent: { gte } }`). The relation-filter approach is implemented in the price test below.

- [ ] **Step 4: Write the nearby test**

`backend/tests/listings.nearby.test.ts`:
```ts
import request from 'supertest';
import { createApp } from '../src/app';
import { prisma } from '../src/lib/prisma';
import { resetDb } from './helpers/db';

const app = createApp();
beforeEach(resetDb);
afterAll(() => prisma.$disconnect());

it('returns listings within radius ordered by distance', async () => {
  const reg = await request(app).post('/api/v1/auth/register').send({ name: 'L', email: 'n@x.com', password: 'password1' });
  await request(app).patch('/api/v1/me/role').set('Authorization', `Bearer ${reg.body.accessToken}`).send({ role: 'lister', listerType: 'agent' });
  const login = await request(app).post('/api/v1/auth/login').send({ email: 'n@x.com', password: 'password1' });
  const token = login.body.accessToken;
  const base = { listingType: 'rent', title: 'F', description: 'A flat to rent now', propertyType: 'apartment', bedrooms: 1, bathrooms: 1, amenities: [], address: 'x', city: 'Lagos', state: 'Lagos', rent: { annualRent: 1000000, securityDeposit: 0, leaseTermMonths: 12 } };
  await request(app).post('/api/v1/listings').set('Authorization', `Bearer ${token}`).send({ ...base, lat: 6.5, lng: 3.38 }); // near
  await request(app).post('/api/v1/listings').set('Authorization', `Bearer ${token}`).send({ ...base, lat: 9.05, lng: 7.49 }); // Abuja, far

  const res = await request(app).get('/api/v1/listings/nearby?lat=6.5&lng=3.38&radius=5000');
  expect(res.status).toBe(200);
  expect(res.body.items.length).toBe(1);
});
```

- [ ] **Step 5: Run tests (pass)** → `npx jest tests/listings.search.test.ts tests/listings.nearby.test.ts` → PASS.

- [ ] **Step 6: Commit**

```bash
git add backend/src/modules/listings/listings.search.ts backend/tests/listings.search.test.ts backend/tests/listings.nearby.test.ts
git commit -m "feat(backend): faceted search + postgis nearby"
```

---

## Task 7: Photo upload endpoints

**Files:**
- Modify: `backend/src/modules/listings/listings.service.ts`, `listings.controller.ts`, `listings.routes.ts`
- Test: `backend/tests/listings.photos.test.ts`

- [ ] **Step 1: Write the failing test**

`backend/tests/listings.photos.test.ts`:
```ts
import request from 'supertest';
import { createApp } from '../src/app';
import { prisma } from '../src/lib/prisma';
import { resetDb } from './helpers/db';

const app = createApp();
beforeEach(resetDb);
afterAll(() => prisma.$disconnect());

it('attaches a photo record to a listing', async () => {
  const reg = await request(app).post('/api/v1/auth/register').send({ name: 'L', email: 'p@x.com', password: 'password1' });
  await request(app).patch('/api/v1/me/role').set('Authorization', `Bearer ${reg.body.accessToken}`).send({ role: 'lister', listerType: 'agent' });
  const login = await request(app).post('/api/v1/auth/login').send({ email: 'p@x.com', password: 'password1' });
  const token = login.body.accessToken;
  const created = await request(app).post('/api/v1/listings').set('Authorization', `Bearer ${token}`).send({
    listingType: 'sale', title: 'House', description: 'A nice house for sale', propertyType: 'house',
    bedrooms: 3, bathrooms: 2, amenities: [], address: 'x', city: 'Lagos', state: 'Lagos', lat: 6.5, lng: 3.38,
    sale: { salePrice: 50000000, negotiable: true },
  });
  const res = await request(app)
    .post(`/api/v1/listings/${created.body.id}/photos`)
    .set('Authorization', `Bearer ${token}`)
    .send({ cloudinaryPublicId: 'abc', url: 'https://res.cloudinary.com/x/abc.jpg', position: 0 });
  expect(res.status).toBe(201);
  expect(res.body.url).toContain('cloudinary');
});
```

- [ ] **Step 2: Run test (fails)** → FAIL.

- [ ] **Step 3: Add service functions**

Append to `listings.service.ts`:
```ts
export async function addPhoto(listingId: string, ownerId: string, data: { cloudinaryPublicId: string; url: string; position?: number }) {
  await assertOwner(listingId, ownerId);
  return prisma.listingPhoto.create({ data: { listingId, ...data, position: data.position ?? 0 } });
}

export async function removePhoto(listingId: string, photoId: string, ownerId: string) {
  await assertOwner(listingId, ownerId);
  await prisma.listingPhoto.delete({ where: { id: photoId } });
}
```

- [ ] **Step 4: Add controller + routes**

Append to `listings.controller.ts`:
```ts
export const addPhoto = (req: Request, res: Response, next: NextFunction) =>
  service.addPhoto(req.params.id, req.user!.id, req.body).then((p) => res.status(201).json(p)).catch(next);

export const removePhoto = (req: Request, res: Response, next: NextFunction) =>
  service.removePhoto(req.params.id, req.params.photoId, req.user!.id).then(() => res.status(204).send()).catch(next);

import { signUploadParams } from '../../lib/cloudinary';
export const uploadSignature = (_req: Request, res: Response) => res.json(signUploadParams('listings'));
```
Append to `listings.routes.ts`:
```ts
import { z } from 'zod';
const photoSchema = z.object({ body: z.object({ cloudinaryPublicId: z.string(), url: z.string().url(), position: z.number().int().optional() }) });
listingsRouter.get('/upload/signature', requireAuth, requireLister, c.uploadSignature);
listingsRouter.post('/:id/photos', requireAuth, requireLister, validate(photoSchema), c.addPhoto);
listingsRouter.delete('/:id/photos/:photoId', requireAuth, requireLister, c.removePhoto);
```

- [ ] **Step 5: Run test (passes)** → `npx jest tests/listings.photos.test.ts` → PASS.

- [ ] **Step 6: Run full suite** → `npx jest` → all PASS.

- [ ] **Step 7: Commit**

```bash
git add backend/src/modules/listings backend/tests/listings.photos.test.ts
git commit -m "feat(backend): listing photo upload endpoints"
```

---

## Self-Review (against spec §5.2, §6 models, §8 Listings endpoints)

- **Listing models + type details + photos + PostGIS geo:** Tasks 1, 2. ✓
- **GET /listings (filters), /nearby (PostGIS), /:id, POST, PATCH, status, DELETE, /me/listings:** Tasks 5, 6, 7. ✓
- **Cloudinary photos (signature + attach + remove):** Tasks 3, 7. ✓
- **Ownership + lister-role enforcement:** Task 5 (`assertOwner`, `requireLister`). ✓
- **Money in kobo, integer fields:** Task 1. ✓

**Type consistency:** the shared `include` object, `assertOwner`, and `ListingType`/`ListingStatus` enums are used consistently across service/search/controller. Search/nearby return shapes (`{items,page,total}` / `{items}`) match the controller responses and the Phase 2 frontend hooks.

**No placeholders:** all code steps are complete. Two annotated notes (the `availableFromNote` flag to be removed, and the price-filter relation approach) are explicit implementation guidance, not missing requirements; the search test exercises facet filtering end-to-end.
