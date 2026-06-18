# Phase 0 — Foundation (Backend) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stand up a runnable, tested Express + TypeScript API backed by PostgreSQL/PostGIS via Prisma, with config validation, error handling, logging, a health endpoint, and a test harness.

**Architecture:** A small Express app exposed via an `createApp()` factory (so tests can mount it without binding a port). Configuration is validated at boot with Zod. Prisma is the single DB access layer against PostgreSQL with the PostGIS extension. A Docker Compose file provides Postgres+PostGIS for local dev. Tests use Jest + Supertest.

**Tech Stack:** Node.js, TypeScript, Express, Prisma, PostgreSQL 16 + PostGIS, Zod, Pino (logging), Jest, Supertest, ts-node-dev.

> **Note on git:** Each task ends with a commit run in your own terminal. If you haven't initialized the repo yet: `cd ~/Projects/HomeBase && git init -b main`.

> **Monorepo layout:** Backend lives in `~/Projects/HomeBase/backend`. Frontend (Phase 0 frontend plan) lives in `~/Projects/HomeBase/mobile`. All paths below are relative to `backend/`.

---

## File Structure (created in this phase)

```
backend/
├── package.json
├── tsconfig.json
├── .env.example
├── .eslintrc.cjs
├── .prettierrc
├── jest.config.cjs
├── docker-compose.yml
├── prisma/
│   └── schema.prisma
└── src/
    ├── config/env.ts          # Zod-validated environment config
    ├── lib/prisma.ts          # Prisma client singleton
    ├── lib/logger.ts          # Pino logger
    ├── middleware/error.ts    # 404 + centralized error handler
    ├── app.ts                 # createApp() Express factory
    ├── server.ts              # boot: validate env, listen
    └── routes/health.ts       # GET /health
tests/
    ├── setup.ts
    ├── health.test.ts
    └── error.test.ts
```

---

## Task 1: Initialize Node + TypeScript project

**Files:**
- Create: `backend/package.json`
- Create: `backend/tsconfig.json`
- Create: `backend/.prettierrc`, `backend/.eslintrc.cjs`

- [ ] **Step 1: Create the backend folder and init npm**

Run:
```bash
mkdir -p ~/Projects/HomeBase/backend && cd ~/Projects/HomeBase/backend
npm init -y
```

- [ ] **Step 2: Install runtime + dev dependencies**

Run:
```bash
npm install express zod pino pino-http @prisma/client
npm install -D typescript ts-node-dev @types/node @types/express \
  jest ts-jest @types/jest supertest @types/supertest \
  prisma eslint prettier
```

- [ ] **Step 3: Write `tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "CommonJS",
    "moduleResolution": "Node",
    "outDir": "dist",
    "rootDir": ".",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "resolveJsonModule": true,
    "forceConsistentCasingInFileNames": true
  },
  "include": ["src/**/*.ts", "tests/**/*.ts"],
  "exclude": ["node_modules", "dist"]
}
```

- [ ] **Step 4: Add scripts to `package.json`**

Set the `"scripts"` block to:
```json
{
  "scripts": {
    "dev": "ts-node-dev --respawn --transpile-only src/server.ts",
    "build": "tsc -p tsconfig.json",
    "start": "node dist/src/server.js",
    "test": "jest --runInBand",
    "prisma:generate": "prisma generate",
    "prisma:migrate": "prisma migrate dev",
    "lint": "eslint 'src/**/*.ts' 'tests/**/*.ts'"
  }
}
```

- [ ] **Step 5: Write `.prettierrc`**

```json
{ "semi": true, "singleQuote": true, "trailingComma": "all", "printWidth": 100 }
```

- [ ] **Step 6: Write `.eslintrc.cjs`**

```js
module.exports = {
  parser: '@typescript-eslint/parser',
  parserOptions: { ecmaVersion: 2022, sourceType: 'module' },
  env: { node: true, es2022: true, jest: true },
  extends: ['eslint:recommended'],
  rules: {},
};
```

- [ ] **Step 7: Commit**

```bash
git add backend && git commit -m "chore(backend): init TypeScript + Express toolchain"
```

---

## Task 2: Environment config (Zod-validated)

**Files:**
- Create: `backend/src/config/env.ts`
- Create: `backend/.env.example`
- Test: `backend/tests/env.test.ts`

- [ ] **Step 1: Write the failing test**

`backend/tests/env.test.ts`:
```ts
import { parseEnv } from '../src/config/env';

describe('parseEnv', () => {
  it('parses valid env', () => {
    const env = parseEnv({
      NODE_ENV: 'test',
      PORT: '4000',
      DATABASE_URL: 'postgresql://u:p@localhost:5432/db',
      JWT_ACCESS_SECRET: 'a'.repeat(32),
      JWT_REFRESH_SECRET: 'b'.repeat(32),
    });
    expect(env.PORT).toBe(4000);
    expect(env.NODE_ENV).toBe('test');
  });

  it('throws when DATABASE_URL is missing', () => {
    expect(() =>
      parseEnv({ NODE_ENV: 'test', PORT: '4000', JWT_ACCESS_SECRET: 'x'.repeat(32), JWT_REFRESH_SECRET: 'y'.repeat(32) }),
    ).toThrow();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest tests/env.test.ts`
Expected: FAIL — cannot find module `../src/config/env`.

- [ ] **Step 3: Write minimal implementation**

`backend/src/config/env.ts`:
```ts
import { z } from 'zod';

const EnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().default(4000),
  DATABASE_URL: z.string().url(),
  JWT_ACCESS_SECRET: z.string().min(32),
  JWT_REFRESH_SECRET: z.string().min(32),
});

export type Env = z.infer<typeof EnvSchema>;

export function parseEnv(source: NodeJS.ProcessEnv | Record<string, unknown> = process.env): Env {
  const result = EnvSchema.safeParse(source);
  if (!result.success) {
    throw new Error(`Invalid environment: ${result.error.message}`);
  }
  return result.data;
}

export const env = (): Env => parseEnv(process.env);
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest tests/env.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 5: Write `.env.example`**

```
NODE_ENV=development
PORT=4000
DATABASE_URL=postgresql://homebase:homebase@localhost:5432/homebase
JWT_ACCESS_SECRET=replace_with_32+_char_random_string_aaaaaaaa
JWT_REFRESH_SECRET=replace_with_32+_char_random_string_bbbbbbbb
```

- [ ] **Step 6: Commit**

```bash
git add backend/src/config/env.ts backend/.env.example backend/tests/env.test.ts
git commit -m "feat(backend): zod-validated environment config"
```

---

## Task 3: Jest harness + Pino logger

**Files:**
- Create: `backend/jest.config.cjs`
- Create: `backend/tests/setup.ts`
- Create: `backend/src/lib/logger.ts`

- [ ] **Step 1: Write `jest.config.cjs`**

```js
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  setupFiles: ['<rootDir>/tests/setup.ts'],
  testMatch: ['<rootDir>/tests/**/*.test.ts'],
};
```

- [ ] **Step 2: Write `tests/setup.ts`**

```ts
process.env.NODE_ENV = 'test';
process.env.PORT = process.env.PORT ?? '4000';
process.env.DATABASE_URL =
  process.env.DATABASE_URL ?? 'postgresql://homebase:homebase@localhost:5432/homebase_test';
process.env.JWT_ACCESS_SECRET = 'a'.repeat(32);
process.env.JWT_REFRESH_SECRET = 'b'.repeat(32);
```

- [ ] **Step 3: Write `src/lib/logger.ts`**

```ts
import pino from 'pino';
export const logger = pino({ level: process.env.NODE_ENV === 'test' ? 'silent' : 'info' });
```

- [ ] **Step 4: Verify harness runs**

Run: `npx jest`
Expected: PASS — previous env tests still pass with setup file applied.

- [ ] **Step 5: Commit**

```bash
git add backend/jest.config.cjs backend/tests/setup.ts backend/src/lib/logger.ts
git commit -m "test(backend): jest harness + pino logger"
```

---

## Task 4: Error + 404 middleware

**Files:**
- Create: `backend/src/middleware/error.ts`
- Test: `backend/tests/error.test.ts`

- [ ] **Step 1: Write the failing test**

`backend/tests/error.test.ts`:
```ts
import express from 'express';
import request from 'supertest';
import { notFound, errorHandler, ApiError } from '../src/middleware/error';

function buildApp() {
  const app = express();
  app.get('/boom', () => {
    throw new ApiError(418, 'teapot');
  });
  app.use(notFound);
  app.use(errorHandler);
  return app;
}

describe('error middleware', () => {
  it('returns structured error for ApiError', async () => {
    const res = await request(buildApp()).get('/boom');
    expect(res.status).toBe(418);
    expect(res.body).toEqual({ error: { message: 'teapot', status: 418 } });
  });

  it('returns 404 for unknown route', async () => {
    const res = await request(buildApp()).get('/nope');
    expect(res.status).toBe(404);
    expect(res.body.error.status).toBe(404);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest tests/error.test.ts`
Expected: FAIL — cannot find module `../src/middleware/error`.

- [ ] **Step 3: Write minimal implementation**

`backend/src/middleware/error.ts`:
```ts
import { NextFunction, Request, Response } from 'express';

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export function notFound(_req: Request, _res: Response, next: NextFunction) {
  next(new ApiError(404, 'Not found'));
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  const status = err instanceof ApiError ? err.status : 500;
  const message = err instanceof Error ? err.message : 'Internal server error';
  res.status(status).json({ error: { message, status } });
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest tests/error.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add backend/src/middleware/error.ts backend/tests/error.test.ts
git commit -m "feat(backend): 404 + centralized error handler"
```

---

## Task 5: App factory + health endpoint

**Files:**
- Create: `backend/src/routes/health.ts`
- Create: `backend/src/app.ts`
- Test: `backend/tests/health.test.ts`

- [ ] **Step 1: Write the failing test**

`backend/tests/health.test.ts`:
```ts
import request from 'supertest';
import { createApp } from '../src/app';

describe('GET /health', () => {
  it('returns ok with uptime', async () => {
    const res = await request(createApp()).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(typeof res.body.uptime).toBe('number');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest tests/health.test.ts`
Expected: FAIL — cannot find module `../src/app`.

- [ ] **Step 3: Write the health route**

`backend/src/routes/health.ts`:
```ts
import { Router } from 'express';

export const healthRouter = Router();

healthRouter.get('/', (_req, res) => {
  res.json({ status: 'ok', uptime: process.uptime() });
});
```

- [ ] **Step 4: Write the app factory**

`backend/src/app.ts`:
```ts
import express from 'express';
import pinoHttp from 'pino-http';
import { logger } from './lib/logger';
import { healthRouter } from './routes/health';
import { notFound, errorHandler } from './middleware/error';

export function createApp() {
  const app = express();
  app.use(express.json());
  app.use(pinoHttp({ logger }));
  app.use('/health', healthRouter);
  app.use(notFound);
  app.use(errorHandler);
  return app;
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx jest tests/health.test.ts`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add backend/src/routes/health.ts backend/src/app.ts backend/tests/health.test.ts
git commit -m "feat(backend): app factory + health endpoint"
```

---

## Task 6: Server boot

**Files:**
- Create: `backend/src/server.ts`

- [ ] **Step 1: Write the server boot file**

`backend/src/server.ts`:
```ts
import { createApp } from './app';
import { parseEnv } from './config/env';
import { logger } from './lib/logger';

const env = parseEnv(process.env);
const app = createApp();

app.listen(env.PORT, () => {
  logger.info(`HomeBase API listening on :${env.PORT}`);
});
```

- [ ] **Step 2: Verify it boots (manual)**

Run (requires a `.env` copied from `.env.example`): `cp .env.example .env && npm run dev`
Expected: log line `HomeBase API listening on :4000`. Then in another terminal:
`curl -s localhost:4000/health` → `{"status":"ok","uptime":...}`. Stop with Ctrl-C.

- [ ] **Step 3: Commit**

```bash
git add backend/src/server.ts && git commit -m "feat(backend): server boot entrypoint"
```

---

## Task 7: PostgreSQL + PostGIS via Docker Compose

**Files:**
- Create: `backend/docker-compose.yml`

- [ ] **Step 1: Write `docker-compose.yml`**

```yaml
services:
  db:
    image: postgis/postgis:16-3.4
    environment:
      POSTGRES_USER: homebase
      POSTGRES_PASSWORD: homebase
      POSTGRES_DB: homebase
    ports:
      - '5432:5432'
    volumes:
      - homebase_pg:/var/lib/postgresql/data
volumes:
  homebase_pg:
```

- [ ] **Step 2: Start the database**

Run: `docker compose up -d db`
Expected: container `db` running. Verify: `docker compose ps` shows `db` as up.

- [ ] **Step 3: Commit**

```bash
git add backend/docker-compose.yml && git commit -m "chore(backend): postgis docker compose for local dev"
```

---

## Task 8: Prisma init + PostGIS extension + connectivity test

**Files:**
- Create: `backend/prisma/schema.prisma`
- Create: `backend/src/lib/prisma.ts`
- Test: `backend/tests/db.test.ts`

- [ ] **Step 1: Initialize Prisma**

Run: `npx prisma init --datasource-provider postgresql`
This creates `prisma/schema.prisma`. Overwrite it in the next step.

- [ ] **Step 2: Write `prisma/schema.prisma`**

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider   = "postgresql"
  url        = env("DATABASE_URL")
  extensions = [postgis]
}

// Minimal model so the first migration is non-empty.
// Real domain models are added in later phases.
model HealthCheck {
  id        String   @id @default(uuid())
  createdAt DateTime @default(now())
}
```

- [ ] **Step 3: Enable preview feature for extensions**

In `schema.prisma`, update the generator/datasource header to enable PostGIS:
```prisma
generator client {
  provider        = "prisma-client-js"
  previewFeatures = ["postgresqlExtensions"]
}
```

- [ ] **Step 4: Create and run the first migration**

Run: `npm run prisma:migrate -- --name init`
Expected: migration created under `prisma/migrations/`, `postgis` extension enabled, `HealthCheck` table created. Prisma client generated.

- [ ] **Step 5: Write the Prisma client singleton**

`backend/src/lib/prisma.ts`:
```ts
import { PrismaClient } from '@prisma/client';
export const prisma = new PrismaClient();
```

- [ ] **Step 6: Write the connectivity test**

`backend/tests/db.test.ts`:
```ts
import { prisma } from '../src/lib/prisma';

afterAll(async () => {
  await prisma.$disconnect();
});

describe('database connectivity', () => {
  it('can run a trivial query', async () => {
    const rows = await prisma.$queryRaw<{ ok: number }[]>`SELECT 1 as ok`;
    expect(rows[0].ok).toBe(1);
  });

  it('has postgis available', async () => {
    const rows = await prisma.$queryRaw<{ postgis_version: string }[]>`SELECT postgis_version()`;
    expect(typeof rows[0].postgis_version).toBe('string');
  });
});
```

- [ ] **Step 7: Run test to verify it passes**

Run (db must be up): `npx jest tests/db.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 8: Commit**

```bash
git add backend/prisma backend/src/lib/prisma.ts backend/tests/db.test.ts
git commit -m "feat(backend): prisma + postgis setup with connectivity tests"
```

---

## Task 9: Full suite + README pointer

**Files:**
- Create: `backend/README.md`

- [ ] **Step 1: Run the full test suite**

Run: `npx jest`
Expected: all tests PASS (env, error, health, db).

- [ ] **Step 2: Write `backend/README.md`**

```markdown
# HomeBase API (backend)

## Setup
1. `cp .env.example .env` and fill secrets.
2. `docker compose up -d db`
3. `npm run prisma:migrate`
4. `npm run dev` → http://localhost:4000/health

## Test
- `npm test` (requires the db container running)
```

- [ ] **Step 3: Commit**

```bash
git add backend/README.md && git commit -m "docs(backend): foundation setup readme"
```

---

## Self-Review (against spec §4 Tech Stack, §10 NFRs)

- **Express + TypeScript API:** Tasks 1, 5, 6. ✓
- **PostgreSQL + Prisma + PostGIS:** Tasks 7, 8. ✓
- **Zod input validation foundation:** Task 2 (env); request-body validation arrives per-endpoint in later phases. ✓
- **Centralized error handler:** Task 4. ✓
- **Structured logging (observability NFR):** Task 3 (Pino) + Task 5 (pino-http). ✓
- **Test harness:** Task 3 (Jest + Supertest). ✓
- **Deferred to later phases (correctly out of Phase 0):** auth/JWT, Helmet/CORS/rate-limit (added in Phase 1 when routes go public), domain models, webhooks.

**Type consistency:** `createApp()`, `parseEnv()`, `ApiError`, `prisma`, `logger`, `healthRouter` are defined once and reused consistently across tasks. No undefined references.

**No placeholders:** every code step contains complete, runnable code.
