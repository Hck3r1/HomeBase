# Phase 3 — Favorites & Messaging (Backend) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement saved listings (favorites) and one-to-one, listing-scoped messaging — REST history plus realtime delivery over Socket.IO (`message:new`, `message:read`, `typing`) with a JWT-authenticated handshake.

**Architecture:** A `favorites` module (schemas/service/controller/routes) backs `GET /favorites`, `POST /favorites/:listingId`, `DELETE /favorites/:listingId`. A `messaging` module backs `GET/POST /conversations` and `GET/POST /conversations/:id/messages`; a conversation is keyed on a `listing` + its two participants (the current user and the listing owner) and creation is idempotent. Realtime lives in `src/realtime/socket.ts`: `createSocketServer(httpServer)` attaches a Socket.IO server to the existing Express HTTP server, authenticates the handshake with `verifyAccessToken`, auto-joins each socket to its conversation rooms, and exposes `getIo()` so the REST message endpoint can emit `message:new` into the room. Reuses Phase 1 `requireAuth`/`validate` and Phase 2 `Listing`.

**Tech Stack:** Express, Prisma, PostgreSQL, Socket.IO (`socket.io`), `jsonwebtoken`, Zod, Jest, Supertest, `socket.io-client` (test only).

> **Note on git:** Each task ends with a commit run in your own terminal. Assumes Phases 0–2 complete (`createApp()`, `ApiError`/`errorHandler`, `prisma`, `env`, `requireAuth`, `validate`, `User`, `Listing`, test harness with `resetDb`).

> All paths relative to `backend/`.

---

## File Structure (created/modified this phase)

```
backend/
├── prisma/schema.prisma                       # + Favorite, Conversation, ConversationParticipant, Message
├── src/
│   ├── realtime/socket.ts                      # Socket.IO server + JWT handshake + getIo()
│   ├── modules/favorites/favorites.schemas.ts
│   ├── modules/favorites/favorites.service.ts
│   ├── modules/favorites/favorites.controller.ts
│   ├── modules/favorites/favorites.routes.ts
│   ├── modules/messaging/messaging.schemas.ts
│   ├── modules/messaging/messaging.service.ts
│   ├── modules/messaging/messaging.controller.ts
│   ├── modules/messaging/messaging.routes.ts
│   ├── app.ts                                  # MODIFY: mount favorites + messaging routers
│   └── server.ts                               # MODIFY: http.createServer + createSocketServer
└── tests/
    ├── helpers/db.ts                           # MODIFY: extend TRUNCATE list
    ├── helpers/server.ts                       # start an http+socket server on an ephemeral port
    ├── favorites.test.ts
    ├── conversations.test.ts
    ├── messages.test.ts
    └── socket.message-new.test.ts
```

---

## Task 1: Prisma models for favorites & messaging

**Files:**
- Modify: `backend/prisma/schema.prisma`

- [ ] **Step 1: Add back-relations to existing models**

In `model User { ... }` add these relation fields (keep existing fields):
```prisma
  favorites               Favorite[]
  conversationParticipants ConversationParticipant[]
  messages                Message[]
```

In `model Listing { ... }` add these relation fields (keep existing fields):
```prisma
  favorites     Favorite[]
  conversations Conversation[]
```

- [ ] **Step 2: Append the new models**

```prisma
model Favorite {
  id        String   @id @default(uuid())
  userId    String
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  listingId String
  listing   Listing  @relation(fields: [listingId], references: [id], onDelete: Cascade)
  createdAt DateTime @default(now())

  @@unique([userId, listingId])
  @@index([userId])
}

model Conversation {
  id           String                    @id @default(uuid())
  listingId    String
  listing      Listing                   @relation(fields: [listingId], references: [id], onDelete: Cascade)
  participants ConversationParticipant[]
  messages     Message[]
  createdAt    DateTime                  @default(now())
  updatedAt    DateTime                  @updatedAt

  @@index([listingId])
}

model ConversationParticipant {
  id             String       @id @default(uuid())
  conversationId String
  conversation   Conversation @relation(fields: [conversationId], references: [id], onDelete: Cascade)
  userId         String
  user           User         @relation(fields: [userId], references: [id], onDelete: Cascade)
  createdAt      DateTime     @default(now())

  @@unique([conversationId, userId])
  @@index([userId])
}

model Message {
  id             String       @id @default(uuid())
  conversationId String
  conversation   Conversation @relation(fields: [conversationId], references: [id], onDelete: Cascade)
  senderId       String
  sender         User         @relation(fields: [senderId], references: [id], onDelete: Cascade)
  body           String
  attachments    Json?
  readAt         DateTime?
  createdAt      DateTime     @default(now())

  @@index([conversationId, createdAt])
}
```

- [ ] **Step 3: Run the migration**

Run: `npm run prisma:migrate -- --name favorites_messaging`
Expected: migration applies; `Favorite`, `Conversation`, `ConversationParticipant`, `Message` tables created; client regenerated.

- [ ] **Step 4: Commit**

```bash
git add backend/prisma && git commit -m "feat(backend): favorite, conversation, participant, message models"
```

---

## Task 2: Extend the test DB reset helper

**Files:**
- Modify: `backend/tests/helpers/db.ts`

- [ ] **Step 1: Add the new tables to the TRUNCATE list**

Update the `TRUNCATE TABLE` statement to include the Phase 3 tables (order does not matter with `CASCADE`, but list them before `Listing`/`User`):
```ts
import { prisma } from '../../src/lib/prisma';

export async function resetDb() {
  await prisma.$executeRawUnsafe(
    'TRUNCATE TABLE "Message","ConversationParticipant","Conversation","Favorite","ListingPhoto","ListingRentDetails","ListingSaleDetails","ListingShortstayDetails","Listing","PushToken","AuthProvider","User" RESTART IDENTITY CASCADE',
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add backend/tests/helpers/db.ts
git commit -m "test(backend): truncate favorites + messaging tables between tests"
```

---

## Task 3: Favorites schemas

**Files:**
- Create: `backend/src/modules/favorites/favorites.schemas.ts`

- [ ] **Step 1: Implement schemas**

```ts
import { z } from 'zod';

export const favoriteParamsSchema = z.object({
  params: z.object({ listingId: z.string().uuid() }),
});
```

- [ ] **Step 2: Commit**

```bash
git add backend/src/modules/favorites/favorites.schemas.ts
git commit -m "feat(backend): favorites zod schema"
```

---

## Task 4: Favorites service + endpoints

**Files:**
- Create: `backend/src/modules/favorites/favorites.service.ts`
- Create: `backend/src/modules/favorites/favorites.controller.ts`
- Create: `backend/src/modules/favorites/favorites.routes.ts`
- Modify: `backend/src/app.ts`
- Test: `backend/tests/favorites.test.ts`

- [ ] **Step 1: Write the failing test**

`backend/tests/favorites.test.ts`:
```ts
import request from 'supertest';
import { createApp } from '../src/app';
import { prisma } from '../src/lib/prisma';
import { resetDb } from './helpers/db';

const app = createApp();
beforeEach(resetDb);
afterAll(() => prisma.$disconnect());

async function seekerToken(email = 's@x.com') {
  const reg = await request(app).post('/api/v1/auth/register').send({ name: 'S', email, password: 'password1' });
  return reg.body.accessToken as string;
}

async function seedListing() {
  const reg = await request(app).post('/api/v1/auth/register').send({ name: 'L', email: 'owner@x.com', password: 'password1' });
  await request(app).patch('/api/v1/me/role').set('Authorization', `Bearer ${reg.body.accessToken}`).send({ role: 'lister', listerType: 'agent' });
  const login = await request(app).post('/api/v1/auth/login').send({ email: 'owner@x.com', password: 'password1' });
  const created = await request(app).post('/api/v1/listings').set('Authorization', `Bearer ${login.body.accessToken}`).send({
    listingType: 'rent', title: 'Flat', description: 'A nice flat to rent', propertyType: 'apartment',
    bedrooms: 2, bathrooms: 1, amenities: [], address: 'x', city: 'Lagos', state: 'Lagos', lat: 6.5, lng: 3.38,
    rent: { annualRent: 1000000, securityDeposit: 0, leaseTermMonths: 12 },
  });
  return created.body.id as string;
}

describe('favorites', () => {
  it('adds a favorite', async () => {
    const token = await seekerToken();
    const listingId = await seedListing();
    const res = await request(app).post(`/api/v1/favorites/${listingId}`).set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(201);
    expect(res.body.listingId).toBe(listingId);
  });

  it('is idempotent on repeated add', async () => {
    const token = await seekerToken();
    const listingId = await seedListing();
    await request(app).post(`/api/v1/favorites/${listingId}`).set('Authorization', `Bearer ${token}`);
    const res = await request(app).post(`/api/v1/favorites/${listingId}`).set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(201);
    const count = await prisma.favorite.count({ where: { listingId } });
    expect(count).toBe(1);
  });

  it('lists favorites with the listing embedded', async () => {
    const token = await seekerToken();
    const listingId = await seedListing();
    await request(app).post(`/api/v1/favorites/${listingId}`).set('Authorization', `Bearer ${token}`);
    const res = await request(app).get('/api/v1/favorites').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].listing.id).toBe(listingId);
  });

  it('removes a favorite', async () => {
    const token = await seekerToken();
    const listingId = await seedListing();
    await request(app).post(`/api/v1/favorites/${listingId}`).set('Authorization', `Bearer ${token}`);
    const res = await request(app).delete(`/api/v1/favorites/${listingId}`).set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(204);
    expect(await prisma.favorite.count()).toBe(0);
  });

  it('401 without a token', async () => {
    const listingId = await seedListing();
    expect((await request(app).post(`/api/v1/favorites/${listingId}`)).status).toBe(401);
  });
});
```

- [ ] **Step 2: Run test (fails)** → `npx jest tests/favorites.test.ts` → FAIL (routes missing).

- [ ] **Step 3: Implement the service**

`backend/src/modules/favorites/favorites.service.ts`:
```ts
import { prisma } from '../../lib/prisma';
import { ApiError } from '../../middleware/error';

const listingInclude = {
  rent: true,
  sale: true,
  shortstay: true,
  photos: true,
  owner: { select: { id: true, name: true, avatarUrl: true, listerType: true } },
};

export async function addFavorite(userId: string, listingId: string) {
  const listing = await prisma.listing.findUnique({ where: { id: listingId }, select: { id: true } });
  if (!listing) throw new ApiError(404, 'Listing not found');
  return prisma.favorite.upsert({
    where: { userId_listingId: { userId, listingId } },
    update: {},
    create: { userId, listingId },
  });
}

export async function removeFavorite(userId: string, listingId: string) {
  await prisma.favorite.deleteMany({ where: { userId, listingId } });
}

export async function listFavorites(userId: string) {
  return prisma.favorite.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    include: { listing: { include: listingInclude } },
  });
}
```

- [ ] **Step 4: Implement the controller**

`backend/src/modules/favorites/favorites.controller.ts`:
```ts
import { Request, Response, NextFunction } from 'express';
import * as service from './favorites.service';

export const add = (req: Request, res: Response, next: NextFunction) =>
  service.addFavorite(req.user!.id, req.params.listingId).then((f) => res.status(201).json(f)).catch(next);

export const remove = (req: Request, res: Response, next: NextFunction) =>
  service.removeFavorite(req.user!.id, req.params.listingId).then(() => res.status(204).send()).catch(next);

export const list = (req: Request, res: Response, next: NextFunction) =>
  service.listFavorites(req.user!.id).then((items) => res.json(items)).catch(next);
```

- [ ] **Step 5: Implement routes**

`backend/src/modules/favorites/favorites.routes.ts`:
```ts
import { Router } from 'express';
import { requireAuth } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { favoriteParamsSchema } from './favorites.schemas';
import * as controller from './favorites.controller';

export const favoritesRouter = Router();

favoritesRouter.get('/', requireAuth, controller.list);
favoritesRouter.post('/:listingId', requireAuth, validate(favoriteParamsSchema), controller.add);
favoritesRouter.delete('/:listingId', requireAuth, validate(favoriteParamsSchema), controller.remove);
```

- [ ] **Step 6: Mount router in `app.ts`**

Add `app.use('/api/v1/favorites', favoritesRouter);` (import it) before `notFound`.

- [ ] **Step 7: Run test (passes)** → `npx jest tests/favorites.test.ts` → PASS (5 tests).

- [ ] **Step 8: Commit**

```bash
git add backend/src/modules/favorites backend/src/app.ts backend/tests/favorites.test.ts
git commit -m "feat(backend): favorites add/remove/list endpoints"
```

---

## Task 5: Messaging schemas

**Files:**
- Create: `backend/src/modules/messaging/messaging.schemas.ts`

- [ ] **Step 1: Implement schemas**

```ts
import { z } from 'zod';

export const createConversationSchema = z.object({
  body: z.object({ listingId: z.string().uuid() }),
});

export const conversationIdSchema = z.object({
  params: z.object({ id: z.string().uuid() }),
});

export const postMessageSchema = z.object({
  params: z.object({ id: z.string().uuid() }),
  body: z.object({ body: z.string().min(1).max(4000) }),
});
```

- [ ] **Step 2: Commit**

```bash
git add backend/src/modules/messaging/messaging.schemas.ts
git commit -m "feat(backend): messaging zod schemas"
```

---

## Task 6: Conversation + message service & REST endpoints

**Files:**
- Create: `backend/src/modules/messaging/messaging.service.ts`
- Create: `backend/src/modules/messaging/messaging.controller.ts`
- Create: `backend/src/modules/messaging/messaging.routes.ts`
- Modify: `backend/src/app.ts`
- Test: `backend/tests/conversations.test.ts`, `backend/tests/messages.test.ts`

- [ ] **Step 1: Write the failing conversation test**

`backend/tests/conversations.test.ts`:
```ts
import request from 'supertest';
import { createApp } from '../src/app';
import { prisma } from '../src/lib/prisma';
import { resetDb } from './helpers/db';

const app = createApp();
beforeEach(resetDb);
afterAll(() => prisma.$disconnect());

async function makeLister(email: string) {
  const reg = await request(app).post('/api/v1/auth/register').send({ name: 'L', email, password: 'password1' });
  await request(app).patch('/api/v1/me/role').set('Authorization', `Bearer ${reg.body.accessToken}`).send({ role: 'lister', listerType: 'agent' });
  const login = await request(app).post('/api/v1/auth/login').send({ email, password: 'password1' });
  return { id: reg.body.user.id, token: login.body.accessToken as string };
}

async function makeSeeker(email: string) {
  const reg = await request(app).post('/api/v1/auth/register').send({ name: 'S', email, password: 'password1' });
  return { id: reg.body.user.id, token: reg.body.accessToken as string };
}

async function makeListing(token: string) {
  const created = await request(app).post('/api/v1/listings').set('Authorization', `Bearer ${token}`).send({
    listingType: 'rent', title: 'Flat', description: 'A nice flat to rent', propertyType: 'apartment',
    bedrooms: 2, bathrooms: 1, amenities: [], address: 'x', city: 'Lagos', state: 'Lagos', lat: 6.5, lng: 3.38,
    rent: { annualRent: 1000000, securityDeposit: 0, leaseTermMonths: 12 },
  });
  return created.body.id as string;
}

describe('conversations', () => {
  it('creates a conversation about a listing with both participants', async () => {
    const owner = await makeLister('owner@x.com');
    const seeker = await makeSeeker('seeker@x.com');
    const listingId = await makeListing(owner.token);
    const res = await request(app).post('/api/v1/conversations').set('Authorization', `Bearer ${seeker.token}`).send({ listingId });
    expect(res.status).toBe(201);
    expect(res.body.listingId).toBe(listingId);
    expect(res.body.participants.map((p: any) => p.userId).sort()).toEqual([owner.id, seeker.id].sort());
  });

  it('is idempotent per (participants, listing)', async () => {
    const owner = await makeLister('owner@x.com');
    const seeker = await makeSeeker('seeker@x.com');
    const listingId = await makeListing(owner.token);
    const first = await request(app).post('/api/v1/conversations').set('Authorization', `Bearer ${seeker.token}`).send({ listingId });
    const second = await request(app).post('/api/v1/conversations').set('Authorization', `Bearer ${seeker.token}`).send({ listingId });
    expect(second.body.id).toBe(first.body.id);
    expect(await prisma.conversation.count()).toBe(1);
  });

  it('rejects starting a conversation on your own listing', async () => {
    const owner = await makeLister('owner@x.com');
    const listingId = await makeListing(owner.token);
    const res = await request(app).post('/api/v1/conversations').set('Authorization', `Bearer ${owner.token}`).send({ listingId });
    expect(res.status).toBe(400);
  });

  it('lists conversations for the current user', async () => {
    const owner = await makeLister('owner@x.com');
    const seeker = await makeSeeker('seeker@x.com');
    const listingId = await makeListing(owner.token);
    await request(app).post('/api/v1/conversations').set('Authorization', `Bearer ${seeker.token}`).send({ listingId });
    const res = await request(app).get('/api/v1/conversations').set('Authorization', `Bearer ${owner.token}`);
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].listingId).toBe(listingId);
  });
});
```

- [ ] **Step 2: Run test (fails)** → `npx jest tests/conversations.test.ts` → FAIL.

- [ ] **Step 3: Implement the service**

`backend/src/modules/messaging/messaging.service.ts`:
```ts
import { prisma } from '../../lib/prisma';
import { ApiError } from '../../middleware/error';

const conversationInclude = {
  participants: { include: { user: { select: { id: true, name: true, avatarUrl: true } } } },
  listing: {
    select: {
      id: true,
      title: true,
      listingType: true,
      photos: { take: 1, orderBy: { position: 'asc' as const } },
    },
  },
  messages: { orderBy: { createdAt: 'desc' as const }, take: 1 },
};

export async function createConversation(userId: string, listingId: string) {
  const listing = await prisma.listing.findUnique({ where: { id: listingId }, select: { id: true, ownerId: true } });
  if (!listing) throw new ApiError(404, 'Listing not found');
  if (listing.ownerId === userId) throw new ApiError(400, 'Cannot start a conversation on your own listing');
  const otherId = listing.ownerId;

  const existing = await prisma.conversation.findFirst({
    where: {
      listingId,
      AND: [
        { participants: { some: { userId } } },
        { participants: { some: { userId: otherId } } },
      ],
    },
    include: conversationInclude,
  });
  if (existing) return existing;

  return prisma.conversation.create({
    data: {
      listingId,
      participants: { create: [{ userId }, { userId: otherId }] },
    },
    include: conversationInclude,
  });
}

export async function listConversations(userId: string) {
  return prisma.conversation.findMany({
    where: { participants: { some: { userId } } },
    orderBy: { updatedAt: 'desc' },
    include: conversationInclude,
  });
}

export async function assertParticipant(conversationId: string, userId: string) {
  const part = await prisma.conversationParticipant.findFirst({ where: { conversationId, userId } });
  if (!part) {
    const exists = await prisma.conversation.findUnique({ where: { id: conversationId }, select: { id: true } });
    throw new ApiError(exists ? 403 : 404, exists ? 'Not a participant' : 'Conversation not found');
  }
}

export async function listMessages(conversationId: string, userId: string) {
  await assertParticipant(conversationId, userId);
  return prisma.message.findMany({ where: { conversationId }, orderBy: { createdAt: 'asc' } });
}

export async function postMessage(conversationId: string, userId: string, body: string) {
  await assertParticipant(conversationId, userId);
  const message = await prisma.message.create({ data: { conversationId, senderId: userId, body } });
  await prisma.conversation.update({ where: { id: conversationId }, data: { updatedAt: new Date() } });
  return message;
}
```

- [ ] **Step 4: Implement the controller**

`backend/src/modules/messaging/messaging.controller.ts`:
```ts
import { Request, Response, NextFunction } from 'express';
import * as service from './messaging.service';
import { getIo, room } from '../../realtime/socket';

export const createConversation = (req: Request, res: Response, next: NextFunction) =>
  service.createConversation(req.user!.id, req.body.listingId).then((c) => res.status(201).json(c)).catch(next);

export const listConversations = (req: Request, res: Response, next: NextFunction) =>
  service.listConversations(req.user!.id).then((items) => res.json(items)).catch(next);

export const listMessages = (req: Request, res: Response, next: NextFunction) =>
  service.listMessages(req.params.id, req.user!.id).then((items) => res.json(items)).catch(next);

export const postMessage = (req: Request, res: Response, next: NextFunction) =>
  service
    .postMessage(req.params.id, req.user!.id, req.body.body)
    .then((message) => {
      getIo()?.to(room(req.params.id)).emit('message:new', message);
      res.status(201).json(message);
    })
    .catch(next);
```

> `src/realtime/socket.ts` is created in Task 7. To keep this task's REST tests runnable now, create the module first with a minimal stub, then flesh it out in Task 7:
> ```ts
> // backend/src/realtime/socket.ts (stub — completed in Task 7)
> import type { Server as IOServer } from 'socket.io';
> let io: IOServer | null = null;
> export function getIo(): IOServer | null { return io; }
> export function setIo(instance: IOServer | null) { io = instance; }
> export function room(conversationId: string) { return `conv:${conversationId}`; }
> ```
> This stub depends on `socket.io` types only; install it now: `npm install socket.io`.

- [ ] **Step 5: Implement routes + mount**

`backend/src/modules/messaging/messaging.routes.ts`:
```ts
import { Router } from 'express';
import { requireAuth } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { createConversationSchema, conversationIdSchema, postMessageSchema } from './messaging.schemas';
import * as controller from './messaging.controller';

export const messagingRouter = Router();

messagingRouter.get('/', requireAuth, controller.listConversations);
messagingRouter.post('/', requireAuth, validate(createConversationSchema), controller.createConversation);
messagingRouter.get('/:id/messages', requireAuth, validate(conversationIdSchema), controller.listMessages);
messagingRouter.post('/:id/messages', requireAuth, validate(postMessageSchema), controller.postMessage);
```

In `app.ts` add `app.use('/api/v1/conversations', messagingRouter);` (import it) before `notFound`.

- [ ] **Step 6: Run conversation test (passes)** → `npx jest tests/conversations.test.ts` → PASS (4 tests).

- [ ] **Step 7: Write the failing message test**

`backend/tests/messages.test.ts`:
```ts
import request from 'supertest';
import { createApp } from '../src/app';
import { prisma } from '../src/lib/prisma';
import { resetDb } from './helpers/db';

const app = createApp();
beforeEach(resetDb);
afterAll(() => prisma.$disconnect());

async function makeLister(email: string) {
  const reg = await request(app).post('/api/v1/auth/register').send({ name: 'L', email, password: 'password1' });
  await request(app).patch('/api/v1/me/role').set('Authorization', `Bearer ${reg.body.accessToken}`).send({ role: 'lister', listerType: 'agent' });
  const login = await request(app).post('/api/v1/auth/login').send({ email, password: 'password1' });
  return { id: reg.body.user.id, token: login.body.accessToken as string };
}
async function makeSeeker(email: string) {
  const reg = await request(app).post('/api/v1/auth/register').send({ name: 'S', email, password: 'password1' });
  return { id: reg.body.user.id, token: reg.body.accessToken as string };
}
async function setup() {
  const owner = await makeLister('owner@x.com');
  const seeker = await makeSeeker('seeker@x.com');
  const created = await request(app).post('/api/v1/listings').set('Authorization', `Bearer ${owner.token}`).send({
    listingType: 'rent', title: 'Flat', description: 'A nice flat to rent', propertyType: 'apartment',
    bedrooms: 2, bathrooms: 1, amenities: [], address: 'x', city: 'Lagos', state: 'Lagos', lat: 6.5, lng: 3.38,
    rent: { annualRent: 1000000, securityDeposit: 0, leaseTermMonths: 12 },
  });
  const convo = await request(app).post('/api/v1/conversations').set('Authorization', `Bearer ${seeker.token}`).send({ listingId: created.body.id });
  return { owner, seeker, conversationId: convo.body.id as string };
}

describe('messages', () => {
  it('posts and lists messages in order', async () => {
    const { owner, seeker, conversationId } = await setup();
    await request(app).post(`/api/v1/conversations/${conversationId}/messages`).set('Authorization', `Bearer ${seeker.token}`).send({ body: 'Hi, is it available?' });
    await request(app).post(`/api/v1/conversations/${conversationId}/messages`).set('Authorization', `Bearer ${owner.token}`).send({ body: 'Yes it is.' });
    const res = await request(app).get(`/api/v1/conversations/${conversationId}/messages`).set('Authorization', `Bearer ${seeker.token}`);
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(2);
    expect(res.body[0].body).toBe('Hi, is it available?');
    expect(res.body[1].body).toBe('Yes it is.');
  });

  it('rejects a non-participant (403)', async () => {
    const { conversationId } = await setup();
    const intruder = await makeSeeker('intruder@x.com');
    const res = await request(app).post(`/api/v1/conversations/${conversationId}/messages`).set('Authorization', `Bearer ${intruder.token}`).send({ body: 'sneaky' });
    expect(res.status).toBe(403);
  });

  it('rejects an empty message body (400)', async () => {
    const { seeker, conversationId } = await setup();
    const res = await request(app).post(`/api/v1/conversations/${conversationId}/messages`).set('Authorization', `Bearer ${seeker.token}`).send({ body: '' });
    expect(res.status).toBe(400);
  });
});
```

- [ ] **Step 8: Run message test (passes)** → `npx jest tests/messages.test.ts` → PASS (3 tests).

- [ ] **Step 9: Commit**

```bash
git add backend/src/modules/messaging backend/src/realtime/socket.ts backend/src/app.ts backend/tests/conversations.test.ts backend/tests/messages.test.ts backend/package.json
git commit -m "feat(backend): conversation + message REST endpoints (idempotent conversations)"
```

---

## Task 7: Socket.IO server with JWT handshake + message:new delivery

**Files:**
- Modify: `backend/src/realtime/socket.ts` (replace the Task 6 stub)
- Modify: `backend/src/server.ts`
- Create: `backend/tests/helpers/server.ts`
- Test: `backend/tests/socket.message-new.test.ts`

- [ ] **Step 1: Install the client test dependency**

Run: `npm install -D socket.io-client`
(`socket.io` was installed in Task 6.)

- [ ] **Step 2: Replace `src/realtime/socket.ts` with the full implementation**

```ts
import { Server as IOServer } from 'socket.io';
import type { Server as HttpServer } from 'http';
import { verifyAccessToken } from '../lib/jwt';
import { prisma } from '../lib/prisma';

let io: IOServer | null = null;

export function getIo(): IOServer | null {
  return io;
}

export function setIo(instance: IOServer | null) {
  io = instance;
}

export function room(conversationId: string) {
  return `conv:${conversationId}`;
}

export function createSocketServer(httpServer: HttpServer): IOServer {
  const server = new IOServer(httpServer, { cors: { origin: true, credentials: true } });

  server.use((socket, next) => {
    const token = socket.handshake.auth?.token as string | undefined;
    if (!token) return next(new Error('Missing token'));
    try {
      const claims = verifyAccessToken(token);
      socket.data.userId = claims.sub;
      next();
    } catch {
      next(new Error('Invalid token'));
    }
  });

  server.on('connection', async (socket) => {
    const userId = socket.data.userId as string;

    // Best-effort auto-join: subscribe the socket to every conversation room it belongs to.
    try {
      const parts = await prisma.conversationParticipant.findMany({
        where: { userId },
        select: { conversationId: true },
      });
      for (const p of parts) socket.join(room(p.conversationId));
    } catch {
      /* non-fatal: explicit conversation:join still works */
    }

    // Deterministic join with ack, used by clients (and tests) to avoid join/emit races.
    socket.on('conversation:join', async (conversationId: string, ack?: (r: { ok: boolean }) => void) => {
      const part = await prisma.conversationParticipant.findFirst({ where: { conversationId, userId } });
      if (part) socket.join(room(conversationId));
      ack?.({ ok: !!part });
    });

    socket.on('typing', ({ conversationId, isTyping }: { conversationId: string; isTyping: boolean }) => {
      socket.to(room(conversationId)).emit('typing', { conversationId, userId, isTyping });
    });

    socket.on('message:read', async ({ conversationId }: { conversationId: string }) => {
      await prisma.message.updateMany({
        where: { conversationId, senderId: { not: userId }, readAt: null },
        data: { readAt: new Date() },
      });
      socket.to(room(conversationId)).emit('message:read', { conversationId, userId });
    });
  });

  setIo(server);
  return server;
}
```

- [ ] **Step 3: Wire it into `src/server.ts`**

Replace `server.ts` with an HTTP server that carries both Express and Socket.IO:
```ts
import http from 'http';
import { createApp } from './app';
import { createSocketServer } from './realtime/socket';
import { parseEnv } from './config/env';

const env = parseEnv(process.env);
const app = createApp();
const httpServer = http.createServer(app);

createSocketServer(httpServer);

httpServer.listen(env.PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`HomeBase API + realtime listening on :${env.PORT}`);
});
```

- [ ] **Step 4: Create a test server helper**

`backend/tests/helpers/server.ts`:
```ts
import http from 'http';
import type { AddressInfo } from 'net';
import { createApp } from '../../src/app';
import { createSocketServer } from '../../src/realtime/socket';

export async function startTestServer() {
  const app = createApp();
  const httpServer = http.createServer(app);
  createSocketServer(httpServer);
  await new Promise<void>((resolve) => httpServer.listen(0, resolve));
  const { port } = httpServer.address() as AddressInfo;
  return { httpServer, port, baseURL: `http://127.0.0.1:${port}` };
}

export function stopTestServer(httpServer: http.Server) {
  return new Promise<void>((resolve) => httpServer.close(() => resolve()));
}
```

- [ ] **Step 5: Write the failing socket integration test**

`backend/tests/socket.message-new.test.ts`:
```ts
import request from 'supertest';
import { io as ioClient, Socket } from 'socket.io-client';
import { prisma } from '../src/lib/prisma';
import { resetDb } from './helpers/db';
import { startTestServer, stopTestServer } from './helpers/server';

let ctx: Awaited<ReturnType<typeof startTestServer>>;

beforeAll(async () => {
  ctx = await startTestServer();
});
beforeEach(resetDb);
afterAll(async () => {
  await stopTestServer(ctx.httpServer);
  await prisma.$disconnect();
});

async function makeLister(email: string) {
  const reg = await request(ctx.httpServer).post('/api/v1/auth/register').send({ name: 'L', email, password: 'password1' });
  await request(ctx.httpServer).patch('/api/v1/me/role').set('Authorization', `Bearer ${reg.body.accessToken}`).send({ role: 'lister', listerType: 'agent' });
  const login = await request(ctx.httpServer).post('/api/v1/auth/login').send({ email, password: 'password1' });
  return { id: reg.body.user.id, token: login.body.accessToken as string };
}
async function makeSeeker(email: string) {
  const reg = await request(ctx.httpServer).post('/api/v1/auth/register').send({ name: 'S', email, password: 'password1' });
  return { id: reg.body.user.id, token: reg.body.accessToken as string };
}

function connect(token: string): Promise<Socket> {
  return new Promise((resolve, reject) => {
    const socket = ioClient(ctx.baseURL, { auth: { token }, transports: ['websocket'], forceNew: true });
    socket.on('connect', () => resolve(socket));
    socket.on('connect_error', reject);
  });
}

describe('socket message:new', () => {
  it('rejects a handshake without a valid token', async () => {
    await expect(
      new Promise((_resolve, reject) => {
        const socket = ioClient(ctx.baseURL, { auth: { token: 'bad' }, transports: ['websocket'], forceNew: true });
        socket.on('connect', () => reject(new Error('should not connect')));
        socket.on('connect_error', (err) => reject(err));
      }),
    ).rejects.toBeTruthy();
  });

  it('delivers message:new to a joined participant', async () => {
    const owner = await makeLister('owner@x.com');
    const seeker = await makeSeeker('seeker@x.com');
    const listing = await request(ctx.httpServer).post('/api/v1/listings').set('Authorization', `Bearer ${owner.token}`).send({
      listingType: 'rent', title: 'Flat', description: 'A nice flat to rent', propertyType: 'apartment',
      bedrooms: 2, bathrooms: 1, amenities: [], address: 'x', city: 'Lagos', state: 'Lagos', lat: 6.5, lng: 3.38,
      rent: { annualRent: 1000000, securityDeposit: 0, leaseTermMonths: 12 },
    });
    const convo = await request(ctx.httpServer).post('/api/v1/conversations').set('Authorization', `Bearer ${seeker.token}`).send({ listingId: listing.body.id });
    const conversationId = convo.body.id as string;

    const ownerSocket = await connect(owner.token);
    await new Promise<void>((resolve) => ownerSocket.emit('conversation:join', conversationId, () => resolve()));

    const received = new Promise<any>((resolve) => ownerSocket.on('message:new', resolve));
    await request(ctx.httpServer).post(`/api/v1/conversations/${conversationId}/messages`).set('Authorization', `Bearer ${seeker.token}`).send({ body: 'Hello over socket' });

    const message = await received;
    expect(message.body).toBe('Hello over socket');
    expect(message.conversationId).toBe(conversationId);

    ownerSocket.disconnect();
  });
});
```

- [ ] **Step 6: Run the socket test (passes)** → `npx jest tests/socket.message-new.test.ts --runInBand` → PASS (2 tests).

> Run socket tests with `--runInBand` so the ephemeral-port server and DB resets do not race across workers.

- [ ] **Step 7: Commit**

```bash
git add backend/src/realtime/socket.ts backend/src/server.ts backend/tests/helpers/server.ts backend/tests/socket.message-new.test.ts backend/package.json
git commit -m "feat(backend): socket.io realtime with jwt handshake + message:new delivery"
```

---

## Task 8: Full suite green

- [ ] **Step 1: Run everything** → `npx jest --runInBand` → all PASS.
- [ ] **Step 2: Commit any cleanups**

```bash
git add -A && git commit -m "test(backend): phase 3 favorites + messaging suite green" || echo "nothing to commit"
```

---

## Self-Review (against spec §5.2 favorites, §5.4 messaging, §6 models, §8 Favorites/Messaging endpoints, §10 NFRs)

- **Models (favorites unique user+listing, conversations, conversation_participants, messages) + migration:** Task 1. ✓
- **resetDb extended with the four new tables:** Task 2. ✓
- **Favorites GET/POST/DELETE (idempotent add via upsert, ownership-free seeker action, 401 gating):** Tasks 3, 4. ✓
- **GET/POST /conversations (about a listing, idempotent per participants+listing, self-listing rejected):** Tasks 5, 6. ✓
- **GET/POST /conversations/:id/messages (ordered history, participant guard, empty-body validation):** Task 6. ✓
- **Socket.IO on the HTTP server in `src/server.ts` + JWT handshake middleware:** Task 7. ✓
- **Events `message:new`, `message:read`, `typing`; REST POST emits `message:new` to the conversation room:** Tasks 6 (emit) + 7 (handlers + rooms). ✓
- **Tests: Supertest favorites + conversation/message REST + a socket.io-client `message:new` integration test:** Tasks 4, 6, 7. ✓

**Type consistency:** `getIo()`/`setIo()`/`room()` from `src/realtime/socket.ts` are the single source for emitting; the controller emits the exact `Message` row it returns over REST; `assertParticipant` is reused by both `listMessages` and `postMessage`; the `conversationInclude`/`listingInclude` shapes match what the Phase 3 frontend hooks consume.

**No placeholders:** every code step is complete and runnable. The only intermediate stub (`src/realtime/socket.ts` in Task 6) is explicitly replaced by the full implementation in Task 7, keeping each task's tests green as written.
