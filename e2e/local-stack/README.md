# Local full stack — database, API, browser

Stands the whole app up on a throwaway Postgres so a change can be *shown*
working instead of argued about. Nothing here touches production.

Written on 3 Sep 2026, when doing this for the first time turned up two things
unit tests could not: three tables and twenty-odd columns that existed only on
the running server and never in the migration history, and a booking detail page
that crashed for every reservation.

## Run it

```bash
# 1. throwaway database
docker run -d --name promo-effect-e2e \
  -e POSTGRES_PASSWORD=e2e -e POSTGRES_USER=e2e -e POSTGRES_DB=promo_effect_e2e \
  -p 55433:5432 postgres:16-alpine

# 2. schema + reference data
export DATABASE_URL=postgresql://e2e:e2e@localhost:55433/promo_effect_e2e
cd backend && npx prisma migrate deploy && npx tsx prisma/seed-e2e.ts

# 3. API on :3099 — needs the env below
npx tsx src/server.ts

# 4. frontend on :3011, pointed at that API
cd .. && echo 'VITE_API_URL=http://localhost:3099/api' > .env.local
npx vite --port 3011 --strictPort

# 5. the checks
npx playwright test --config=e2e/local-stack/playwright.config.ts
```

Minimum backend env (anything else can stay unset — background jobs are off, so
no IMAP or AIS traffic):

```
NODE_ENV=development
PORT=3099
DATABASE_URL=postgresql://e2e:e2e@localhost:55433/promo_effect_e2e
ENCRYPTION_KEY=<64 hex chars>
JWT_SECRET=<32+ chars>
JWT_REFRESH_SECRET=<32+ chars, different>
CSRF_SECRET=<32+ chars>
ENABLE_BACKGROUND_JOBS=false
STORAGE_PROVIDER=local
STORAGE_LOCAL_PATH=/tmp/promo-effect-e2e-uploads
```

Login: `e2e-admin@local.test` / `E2ePassw0rd!`

## What the seed puts in

The real reference figures from production on 3 Sep 2026, so the numbers these
tests produce are comparable to what the client sees:

| | |
|---|---|
| base_prices | Shanghai→Constanța, Maersk 40HQ $6455 (60d), CMA CGM 40HQ $6500 (65d) |
| port_pricing_matrix | Ningbo 40HQ +$100 (Ningbo has no rate of its own — this is the substitution the calculator makes) |
| shipping_line_containers | Maersk 40HC $520, CMA CGM 40HC $700 |
| land_transport_rates | IMPORT Chișinău 23–24 t → $1550 |
| admin_settings | customs $180, insurance $50 |

A CFR Maersk quote for 1×40HQ to Chișinău therefore comes to **$2475**
(700 local + 1550 land + 10% of 2250), which is the figure on the client's
screenshot of 3 Sep.

## Tear down

```bash
docker rm -f promo-effect-e2e
rm .env.local
```
