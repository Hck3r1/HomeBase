# HomeBase API (backend)

## Setup
1. `cp .env.example .env` and fill secrets.
2. `docker compose up -d db`
3. `npm run prisma:migrate`
4. `npm run dev` → http://localhost:4000/health

## Test
- `npm test` (requires the db container running)
