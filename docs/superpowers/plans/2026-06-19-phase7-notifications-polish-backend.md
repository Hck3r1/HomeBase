# Phase 7 — Notifications & Polish (Backend) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the notifications system (persisted `Notification` rows + Expo push delivery to a user's registered devices), the notification REST endpoints (`GET /notifications`, `PATCH /notifications/:id/read`, `PATCH /notifications/read-all`), an example event trigger (booking confirmed / new message), and the account-settings endpoints `PATCH /me/password` (verify old → set new) and `DELETE /me` (delete account).

**Architecture:** A reusable `src/lib/notifications.ts` exposes `notify({ userId, type, payload })` which (a) persists a `Notification` row and (b) fans out an Expo push to every `PushToken` the user has registered (reusing the Phase 1 `push_tokens` model + `POST /me/push-token`). Typed event helpers in `src/modules/notifications/notifications.events.ts` wrap `notify()` so feature code (e.g. the bookings module) can fire well-named events. A `notifications` module (`schemas`/`service`/`controller`/`routes`) serves the list/read endpoints, all gated by `requireAuth` and scoped to `req.user.id`. Account settings extend the existing Phase 1 `users` module — password change reuses the `hashPassword`/`verifyPassword` util, and account deletion relies on Prisma `onDelete: Cascade` relations.

**Tech Stack:** Express, Prisma, PostgreSQL, expo-server-sdk, bcrypt (via existing password util), Zod, Jest, Supertest.

> **Note on git:** Each task ends with a commit run in your own terminal. Assumes Phases 0–6 are complete (`createApp()`, `ApiError`/`errorHandler`, `prisma`, `env`, `requireAuth`, `validate`, `hashPassword`/`verifyPassword`, the `User` + `PushToken` models, the `users` module with `POST /me/push-token`, and `tests/helpers/db.ts` `resetDb`).

> All paths relative to `backend/`.

---

## File Structure (created/modified this phase)

```
backend/
├── prisma/schema.prisma                          # + Notification model (+ User relation)
├── src/
│   ├── lib/notifications.ts                       # notify(): persist + Expo push fan-out
│   ├── modules/notifications/notifications.events.ts   # typed event helpers (booking/message)
│   ├── modules/notifications/notifications.service.ts
│   ├── modules/notifications/notifications.controller.ts
│   ├── modules/notifications/notifications.routes.ts
│   ├── modules/users/users.controller.ts          # MODIFY: changePassword, deleteAccount
│   ├── modules/users/users.routes.ts              # MODIFY: PATCH /me/password, DELETE /me
│   └── app.ts                                      # MODIFY: mount notifications router
└── tests/
    ├── helpers/db.ts                               # MODIFY: TRUNCATE Notification
    ├── notifications.service.test.ts               # persist + push fan-out (mock expo-server-sdk)
    ├── notifications.api.test.ts                   # list + read + read-all
    └── account.settings.test.ts                    # password change + delete account
```

---

## Task 1: Prisma model for notifications

**Files:**
- Modify: `backend/prisma/schema.prisma`

- [ ] **Step 1: Add the `Notification` model and the `User` relation**

Append the model:
```prisma
model Notification {
  id        String    @id @default(uuid())
  userId    String
  user      User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  type      String
  payload   Json      @default("{}")
  readAt    DateTime?
  createdAt DateTime  @default(now())

  @@index([userId, readAt])
}
```

On the existing `User` model, add the back-relation field (alongside `pushTokens`):
```prisma
  notifications Notification[]
```

- [ ] **Step 2: Run the migration**

Run: `npm run prisma:migrate -- --name notifications`
Expected: migration applies; `Notification` table created with an index on `(userId, readAt)`; client regenerated.

- [ ] **Step 3: Commit**

```bash
git add backend/prisma && git commit -m "feat(backend): notification model"
```

---

## Task 2: Notification service (persist + Expo push fan-out)

**Files:**
- Create: `backend/src/lib/notifications.ts`
- Modify: `backend/tests/helpers/db.ts`
- Test: `backend/tests/notifications.service.test.ts`

- [ ] **Step 1: Install expo-server-sdk**

Run: `npm install expo-server-sdk`

- [ ] **Step 2: Extend the test DB reset helper**

In `backend/tests/helpers/db.ts`, add `"Notification"` to the front of the TRUNCATE list (keep the existing tables):
```ts
await prisma.$executeRawUnsafe(
  'TRUNCATE TABLE "Notification","PushToken","AuthProvider","User" RESTART IDENTITY CASCADE',
);
```

> If later phases already truncate more tables, just insert `"Notification",` at the start of the existing list — order only matters for FK-free `CASCADE`, which we use, so prepending is always safe.

- [ ] **Step 3: Write the failing test (mock expo-server-sdk)**

`backend/tests/notifications.service.test.ts`:
```ts
const sendPushNotificationsAsync = jest.fn().mockResolvedValue([{ status: 'ok' }]);

jest.mock('expo-server-sdk', () => ({
  Expo: class {
    static isExpoPushToken = (t: string) => t.startsWith('ExponentPushToken');
    chunkPushNotifications = (messages: unknown[]) => [messages];
    sendPushNotificationsAsync = sendPushNotificationsAsync;
  },
}));

import { prisma } from '../src/lib/prisma';
import { resetDb } from './helpers/db';
import { notify } from '../src/lib/notifications';

beforeEach(async () => {
  resetDbDone = await resetDb();
  sendPushNotificationsAsync.mockClear();
});
let resetDbDone: unknown;
afterAll(() => prisma.$disconnect());

async function makeUser(email: string) {
  return prisma.user.create({ data: { name: 'N', email, passwordHash: 'x' } });
}

describe('notify', () => {
  it('persists a notification row', async () => {
    const user = await makeUser('n1@x.com');
    const notification = await notify({ userId: user.id, type: 'booking_confirmed', payload: { bookingId: 'b1' } });
    expect(notification.id).toBeTruthy();
    expect(notification.readAt).toBeNull();
    const rows = await prisma.notification.findMany({ where: { userId: user.id } });
    expect(rows).toHaveLength(1);
    expect(rows[0].type).toBe('booking_confirmed');
    expect((rows[0].payload as any).bookingId).toBe('b1');
  });

  it('sends an Expo push to each valid registered token', async () => {
    const user = await makeUser('n2@x.com');
    await prisma.pushToken.create({ data: { userId: user.id, token: 'ExponentPushToken[aaa]', platform: 'ios' } });
    await prisma.pushToken.create({ data: { userId: user.id, token: 'ExponentPushToken[bbb]', platform: 'android' } });
    await prisma.pushToken.create({ data: { userId: user.id, token: 'not-a-real-token', platform: 'ios' } });

    await notify({ userId: user.id, type: 'message_new', payload: { conversationId: 'c1' } });

    expect(sendPushNotificationsAsync).toHaveBeenCalledTimes(1);
    const sent = sendPushNotificationsAsync.mock.calls[0][0] as any[];
    expect(sent).toHaveLength(2); // invalid token filtered out
    expect(sent[0].to).toBe('ExponentPushToken[aaa]');
    expect(sent[0].data.type).toBe('message_new');
  });

  it('skips the push send when the user has no tokens', async () => {
    const user = await makeUser('n3@x.com');
    await notify({ userId: user.id, type: 'booking_confirmed', payload: {} });
    expect(sendPushNotificationsAsync).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 4: Run test (fails)** → `npx jest tests/notifications.service.test.ts` → FAIL (module not found).

- [ ] **Step 5: Implement `src/lib/notifications.ts`**

```ts
import { Expo, ExpoPushMessage } from 'expo-server-sdk';
import { prisma } from './prisma';
import { logger } from './logger';

const expo = new Expo();

export interface NotifyInput {
  userId: string;
  type: string;
  payload?: Record<string, unknown>;
}

const TITLES: Record<string, string> = {
  booking_confirmed: 'Booking confirmed',
  booking_request: 'New booking request',
  message_new: 'New message',
  application_update: 'Application update',
  viewing_scheduled: 'Viewing scheduled',
};

function titleFor(type: string): string {
  return TITLES[type] ?? 'HomeBase';
}

function bodyFor(type: string, payload: Record<string, unknown>): string {
  switch (type) {
    case 'booking_confirmed':
      return 'Your stay is confirmed. Tap to view the details.';
    case 'booking_request':
      return 'A guest wants to book your place.';
    case 'message_new':
      return (payload.preview as string) ?? 'You have a new message.';
    case 'application_update':
      return 'There is an update on your rent application.';
    case 'viewing_scheduled':
      return 'An inspection has been scheduled.';
    default:
      return 'You have a new notification.';
  }
}

async function sendPush(userId: string, type: string, payload: Record<string, unknown>): Promise<void> {
  const tokens = await prisma.pushToken.findMany({ where: { userId } });
  const messages: ExpoPushMessage[] = tokens
    .filter((t) => Expo.isExpoPushToken(t.token))
    .map((t) => ({
      to: t.token,
      sound: 'default',
      title: titleFor(type),
      body: bodyFor(type, payload),
      data: { type, ...payload },
    }));

  if (messages.length === 0) return;

  const chunks = expo.chunkPushNotifications(messages);
  for (const chunk of chunks) {
    try {
      await expo.sendPushNotificationsAsync(chunk);
    } catch (err) {
      // A failed push must never break the originating request; log and continue.
      logger.error({ err, userId, type }, 'expo push send failed');
    }
  }
}

export async function notify({ userId, type, payload = {} }: NotifyInput) {
  const notification = await prisma.notification.create({
    data: { userId, type, payload },
  });
  await sendPush(userId, type, payload);
  return notification;
}
```

- [ ] **Step 6: Run test (passes)** → `npx jest tests/notifications.service.test.ts` → PASS (3 tests).

- [ ] **Step 7: Commit**

```bash
git add backend/src/lib/notifications.ts backend/tests/notifications.service.test.ts backend/tests/helpers/db.ts backend/package.json
git commit -m "feat(backend): notification service with expo push fan-out"
```

---

## Task 3: Typed event helpers + example trigger

**Files:**
- Create: `backend/src/modules/notifications/notifications.events.ts`

> This task gives feature code a small, well-named API over `notify()` so a flow like **booking confirmed** or **new message** fires the right notification in one line. The bookings module from the earlier booking phase calls `notifyBookingConfirmed(...)` exactly where it flips a booking to `confirmed`; the example wiring is shown below as guidance.

- [ ] **Step 1: Implement `notifications.events.ts`**

```ts
import { notify } from '../../lib/notifications';

export function notifyBookingConfirmed(guestId: string, bookingId: string, listingTitle: string) {
  return notify({
    userId: guestId,
    type: 'booking_confirmed',
    payload: { bookingId, listingTitle },
  });
}

export function notifyBookingRequest(hostId: string, bookingId: string, listingTitle: string) {
  return notify({
    userId: hostId,
    type: 'booking_request',
    payload: { bookingId, listingTitle },
  });
}

export function notifyNewMessage(recipientId: string, conversationId: string, preview: string) {
  return notify({
    userId: recipientId,
    type: 'message_new',
    payload: { conversationId, preview },
  });
}

export function notifyApplicationUpdate(applicantId: string, applicationId: string, status: string) {
  return notify({
    userId: applicantId,
    type: 'application_update',
    payload: { applicationId, status },
  });
}
```

- [ ] **Step 2: Example trigger (reference wiring — no new file)**

Where the bookings service confirms a paid booking (e.g. inside the Paystack webhook handler that flips `booking.status = 'confirmed'`), fire the event right after the DB write:
```ts
import { notifyBookingConfirmed } from '../notifications/notifications.events';

// ...after: const booking = await prisma.booking.update({ where: { id }, data: { status: 'confirmed' }, include: { listing: true } });
await notifyBookingConfirmed(booking.guestId, booking.id, booking.listing.title);
```
And where a message is created in the messaging service, after persisting the message:
```ts
import { notifyNewMessage } from '../notifications/notifications.events';

// ...after creating the message and resolving the recipient userId:
await notifyNewMessage(recipientId, message.conversationId, message.body.slice(0, 80));
```

> These two snippets are the integration points; they live in the bookings/messaging modules that already exist from earlier phases. No code in this task depends on them compiling — the helpers above are self-contained and unit-tested via Task 2's `notify`.

- [ ] **Step 3: Commit**

```bash
git add backend/src/modules/notifications/notifications.events.ts
git commit -m "feat(backend): typed notification event helpers"
```

---

## Task 4: Notification endpoints (list, read, read-all)

**Files:**
- Create: `backend/src/modules/notifications/notifications.service.ts`
- Create: `backend/src/modules/notifications/notifications.controller.ts`
- Create: `backend/src/modules/notifications/notifications.routes.ts`
- Modify: `backend/src/app.ts`
- Test: `backend/tests/notifications.api.test.ts`

- [ ] **Step 1: Write the failing test**

`backend/tests/notifications.api.test.ts`:
```ts
import request from 'supertest';
import { createApp } from '../src/app';
import { prisma } from '../src/lib/prisma';
import { resetDb } from './helpers/db';

const app = createApp();
beforeEach(resetDb);
afterAll(() => prisma.$disconnect());

async function authedUser(email: string) {
  const reg = await request(app).post('/api/v1/auth/register').send({ name: 'A', email, password: 'password1' });
  return { token: reg.body.accessToken as string, id: reg.body.user.id as string };
}

describe('notifications API', () => {
  it('lists the current user notifications (newest first) with an unread count', async () => {
    const me = await authedUser('list@x.com');
    const other = await authedUser('other@x.com');
    await prisma.notification.create({ data: { userId: me.id, type: 'booking_confirmed', payload: { bookingId: 'b1' } } });
    await prisma.notification.create({ data: { userId: me.id, type: 'message_new', payload: { conversationId: 'c1' } } });
    await prisma.notification.create({ data: { userId: other.id, type: 'message_new', payload: {} } });

    const res = await request(app).get('/api/v1/notifications').set('Authorization', `Bearer ${me.token}`);
    expect(res.status).toBe(200);
    expect(res.body.items).toHaveLength(2);
    expect(res.body.unreadCount).toBe(2);
    expect(res.body.items[0].type).toBe('message_new'); // newest first
  });

  it('marks a single notification as read', async () => {
    const me = await authedUser('read@x.com');
    const n = await prisma.notification.create({ data: { userId: me.id, type: 'booking_confirmed', payload: {} } });
    const res = await request(app).patch(`/api/v1/notifications/${n.id}/read`).set('Authorization', `Bearer ${me.token}`);
    expect(res.status).toBe(200);
    expect(res.body.readAt).toBeTruthy();
  });

  it('does not let a user read another user notification (404)', async () => {
    const me = await authedUser('me@x.com');
    const other = await authedUser('them@x.com');
    const n = await prisma.notification.create({ data: { userId: other.id, type: 'message_new', payload: {} } });
    const res = await request(app).patch(`/api/v1/notifications/${n.id}/read`).set('Authorization', `Bearer ${me.token}`);
    expect(res.status).toBe(404);
  });

  it('marks all notifications as read', async () => {
    const me = await authedUser('all@x.com');
    await prisma.notification.create({ data: { userId: me.id, type: 'booking_confirmed', payload: {} } });
    await prisma.notification.create({ data: { userId: me.id, type: 'message_new', payload: {} } });
    const res = await request(app).patch('/api/v1/notifications/read-all').set('Authorization', `Bearer ${me.token}`);
    expect(res.status).toBe(200);
    expect(res.body.updated).toBe(2);
    const list = await request(app).get('/api/v1/notifications').set('Authorization', `Bearer ${me.token}`);
    expect(list.body.unreadCount).toBe(0);
  });
});
```

- [ ] **Step 2: Run test (fails)** → `npx jest tests/notifications.api.test.ts` → FAIL (routes missing).

- [ ] **Step 3: Implement the service**

`backend/src/modules/notifications/notifications.service.ts`:
```ts
import { prisma } from '../../lib/prisma';
import { ApiError } from '../../middleware/error';

export async function listNotifications(userId: string) {
  const [items, unreadCount] = await Promise.all([
    prisma.notification.findMany({ where: { userId }, orderBy: { createdAt: 'desc' }, take: 100 }),
    prisma.notification.count({ where: { userId, readAt: null } }),
  ]);
  return { items, unreadCount };
}

export async function markRead(userId: string, id: string) {
  const notification = await prisma.notification.findFirst({ where: { id, userId } });
  if (!notification) throw new ApiError(404, 'Notification not found');
  return prisma.notification.update({ where: { id }, data: { readAt: new Date() } });
}

export async function markAllRead(userId: string) {
  const result = await prisma.notification.updateMany({
    where: { userId, readAt: null },
    data: { readAt: new Date() },
  });
  return { updated: result.count };
}
```

- [ ] **Step 4: Implement the controller**

`backend/src/modules/notifications/notifications.controller.ts`:
```ts
import { Request, Response, NextFunction } from 'express';
import * as service from './notifications.service';

export const list = (req: Request, res: Response, next: NextFunction) =>
  service.listNotifications(req.user!.id).then((r) => res.json(r)).catch(next);

export const markRead = (req: Request, res: Response, next: NextFunction) =>
  service.markRead(req.user!.id, req.params.id).then((n) => res.json(n)).catch(next);

export const markAllRead = (req: Request, res: Response, next: NextFunction) =>
  service.markAllRead(req.user!.id).then((r) => res.json(r)).catch(next);
```

- [ ] **Step 5: Implement routes**

`backend/src/modules/notifications/notifications.routes.ts`:
```ts
import { Router } from 'express';
import { requireAuth } from '../../middleware/auth';
import * as controller from './notifications.controller';

export const notificationsRouter = Router();

notificationsRouter.get('/', requireAuth, controller.list);
notificationsRouter.patch('/read-all', requireAuth, controller.markAllRead);
notificationsRouter.patch('/:id/read', requireAuth, controller.markRead);
```

> `/read-all` is registered before `/:id/read` so Express does not match the literal `read-all` as an `:id`.

- [ ] **Step 6: Mount in `app.ts`**

Add `app.use('/api/v1/notifications', notificationsRouter);` (import it) before `notFound`.

- [ ] **Step 7: Run test (passes)** → `npx jest tests/notifications.api.test.ts` → PASS (4 tests).

- [ ] **Step 8: Commit**

```bash
git add backend/src/modules/notifications backend/src/app.ts backend/tests/notifications.api.test.ts
git commit -m "feat(backend): notification list/read/read-all endpoints"
```

---

## Task 5: Account settings (change password, delete account)

**Files:**
- Modify: `backend/src/modules/users/users.controller.ts`
- Modify: `backend/src/modules/users/users.routes.ts`
- Test: `backend/tests/account.settings.test.ts`

- [ ] **Step 1: Write the failing test**

`backend/tests/account.settings.test.ts`:
```ts
import request from 'supertest';
import { createApp } from '../src/app';
import { prisma } from '../src/lib/prisma';
import { resetDb } from './helpers/db';

const app = createApp();
beforeEach(resetDb);
afterAll(() => prisma.$disconnect());

async function authedUser(email: string) {
  const reg = await request(app).post('/api/v1/auth/register').send({ name: 'A', email, password: 'password1' });
  return { token: reg.body.accessToken as string, id: reg.body.user.id as string };
}

describe('account settings', () => {
  it('changes the password when the old password is correct', async () => {
    const me = await authedUser('pw@x.com');
    const res = await request(app)
      .patch('/api/v1/me/password')
      .set('Authorization', `Bearer ${me.token}`)
      .send({ oldPassword: 'password1', newPassword: 'newpassword2' });
    expect(res.status).toBe(200);
    const login = await request(app).post('/api/v1/auth/login').send({ email: 'pw@x.com', password: 'newpassword2' });
    expect(login.status).toBe(200);
  });

  it('rejects a password change when the old password is wrong (400)', async () => {
    const me = await authedUser('pw2@x.com');
    const res = await request(app)
      .patch('/api/v1/me/password')
      .set('Authorization', `Bearer ${me.token}`)
      .send({ oldPassword: 'wrongpass', newPassword: 'newpassword2' });
    expect(res.status).toBe(400);
  });

  it('deletes the account', async () => {
    const me = await authedUser('del@x.com');
    const res = await request(app).delete('/api/v1/me').set('Authorization', `Bearer ${me.token}`);
    expect(res.status).toBe(204);
    const user = await prisma.user.findUnique({ where: { id: me.id } });
    expect(user).toBeNull();
  });
});
```

- [ ] **Step 2: Run test (fails)** → `npx jest tests/account.settings.test.ts` → FAIL (routes missing).

- [ ] **Step 3: Add controller handlers**

Append to `backend/src/modules/users/users.controller.ts` (reuse the Phase 1 password util + `ApiError`):
```ts
import { hashPassword, verifyPassword } from '../../lib/password';

export async function changePassword(req: Request, res: Response, next: NextFunction) {
  try {
    const { oldPassword, newPassword } = req.body;
    const user = await prisma.user.findUnique({ where: { id: req.user!.id } });
    if (!user?.passwordHash || !(await verifyPassword(oldPassword, user.passwordHash))) {
      throw new ApiError(400, 'Current password is incorrect');
    }
    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash: await hashPassword(newPassword) },
    });
    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
}

export async function deleteAccount(req: Request, res: Response, next: NextFunction) {
  try {
    await prisma.user.delete({ where: { id: req.user!.id } });
    res.status(204).send();
  } catch (e) {
    next(e);
  }
}
```

> Deleting the `User` cascades to `PushToken`, `AuthProvider`, and `Notification` (all declared `onDelete: Cascade`), so no manual cleanup is required.

- [ ] **Step 4: Add routes**

Append to `backend/src/modules/users/users.routes.ts` (extend the existing `usersRouter` + Zod imports):
```ts
import { z } from 'zod';
// (z is already imported in this file from Phase 1; keep a single import.)

const passwordSchema = z.object({
  body: z.object({ oldPassword: z.string().min(1), newPassword: z.string().min(8) }),
});

usersRouter.patch('/me/password', requireAuth, validate(passwordSchema), controller.changePassword);
usersRouter.delete('/me', requireAuth, controller.deleteAccount);
```

- [ ] **Step 5: Run test (passes)** → `npx jest tests/account.settings.test.ts` → PASS (3 tests).

- [ ] **Step 6: Commit**

```bash
git add backend/src/modules/users backend/tests/account.settings.test.ts
git commit -m "feat(backend): change-password + delete-account endpoints"
```

---

## Task 6: Full suite green

- [ ] **Step 1: Run everything** → `npx jest` → all PASS.
- [ ] **Step 2: Commit any cleanups**

```bash
git add -A && git commit -m "test(backend): phase 7 notifications + settings suite green" || echo "nothing to commit"
```

---

## Self-Review (against spec §5.6 Account & Trust, §6 models `notifications`/`push_tokens`, §8 Notifications endpoints, §10 NFRs)

- **`notifications` model (user, type, payload jsonb, read_at):** Task 1 — `Notification` with `payload Json`, nullable `readAt`, `(userId, readAt)` index, cascade-on-user-delete. ✓
- **Notification service: persist + Expo push to `push_tokens`:** Task 2 — `notify()` writes a row then fans out via `expo-server-sdk` to every valid registered token (reuses Phase 1 `PushToken`). ✓
- **Event trigger example (booking confirmed / new message):** Task 3 — typed `notifyBookingConfirmed`/`notifyNewMessage` helpers + reference wiring into the bookings/messaging modules. ✓
- **`GET /notifications`, `PATCH /notifications/:id/read`, `PATCH /notifications/read-all`:** Task 4 — all scoped to `req.user.id`, with cross-user reads returning 404 and an `unreadCount` for the badge. ✓
- **`PATCH /me/password` (verify old → set new), `DELETE /me`:** Task 5 — reuses `verifyPassword`/`hashPassword`; deletion cascades. ✓
- **Tests — notification create+list+read, push-send (mock expo-server-sdk), password-change:** Tasks 2, 4, 5. ✓
- **NFRs (input validation, auth scoping, push failure never breaks the request):** `validate(passwordSchema)`, `requireAuth` on every route, try/catch around `sendPushNotificationsAsync`. ✓

**Type consistency:** `notify({ userId, type, payload })` is the single entry point used by both the event helpers and (transitively) the unit tests; the notifications service returns `{ items, unreadCount }` and `{ updated }` shapes that the Phase 7 frontend hooks consume; route ordering (`/read-all` before `/:id/read`) and `req.user.id` scoping match the `requireAuth` contract from Phase 1.

**No placeholders:** every code step is complete and runnable. The only narrative content (Task 3 Step 2) is an explicit, clearly-bounded reference for wiring the already-tested `notify()` into existing feature modules — not a missing requirement.
