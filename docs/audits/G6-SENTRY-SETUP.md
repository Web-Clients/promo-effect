# G6 — Sentry Integration

**Date:** 2026-04-30
**Status:** Both frontend and backend have Sentry initialized; needs hardening

---

## Current State

### Frontend — `utils/sentry.ts`

```ts
import * as Sentry from '@sentry/react';

export function initSentry() {
  const dsn = import.meta.env.VITE_SENTRY_DSN;
  if (!dsn) return;

  Sentry.init({
    dsn,
    environment: import.meta.env.MODE,
    tracesSampleRate: 0.1,
    enabled: import.meta.env.PROD,
  });
}
```

Called in `index.tsx` before rendering. Env var: `VITE_SENTRY_DSN`.

### Backend — `backend/src/server.ts`

```ts
import * as Sentry from '@sentry/node';

if (process.env.SENTRY_DSN) {
  Sentry.init({ dsn: process.env.SENTRY_DSN, environment: process.env.NODE_ENV });
}
```

Also referenced in `backend/src/app.ts` error handler (line 202) via `require('@sentry/node')`.
Env var: `SENTRY_DSN`.

---

## Environment Variables

| Var                      | Location                     | Example                                |
| ------------------------ | ---------------------------- | -------------------------------------- |
| `VITE_SENTRY_DSN`        | `.env.production` (frontend) | `https://xxxx@o0.ingest.sentry.io/0`   |
| `SENTRY_DSN`             | `.env` (backend / server)    | `https://xxxx@o0.ingest.sentry.io/0`   |
| `VITE_SENTRY_AUTH_TOKEN` | `.env` (CI build)            | `sntrys_xxxx` — for source maps upload |

---

## Recommended Improvements

### 1. Add release tracking

```ts
// Frontend
Sentry.init({
  dsn,
  release: import.meta.env.VITE_APP_VERSION ?? 'unknown',
  environment: import.meta.env.MODE,
  tracesSampleRate: 0.1,
  enabled: import.meta.env.PROD,
});

// Backend
Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
  release: process.env.APP_VERSION ?? 'unknown',
});
```

### 2. Filter PII from errors

```ts
Sentry.init({
  dsn,
  beforeSend(event) {
    // Strip request body that may contain passwords / tokens
    if (event.request?.data) {
      const data = event.request.data as Record<string, unknown>;
      delete data.password;
      delete data.token;
      delete data.refreshToken;
      delete data.currentPassword;
      delete data.newPassword;
    }
    return event;
  },
});
```

### 3. Source maps upload in CI

In `.github/workflows/ci.yml`, after `npm run build`:

```yaml
- name: Upload source maps to Sentry
  run: npx @sentry/cli releases files "$APP_VERSION" upload-sourcemaps dist/
  env:
    SENTRY_AUTH_TOKEN: ${{ secrets.SENTRY_AUTH_TOKEN }}
    SENTRY_ORG: your-org
    SENTRY_PROJECT: promo-effect-frontend
    APP_VERSION: ${{ github.sha }}
```

Also add to Vite config:

```ts
import { sentryVitePlugin } from '@sentry/vite-plugin';

plugins: [
  react(),
  tailwindcss(),
  sentryVitePlugin({
    org: 'your-org',
    project: 'promo-effect-frontend',
    authToken: process.env.SENTRY_AUTH_TOKEN,
  }),
];
```

### 4. Backend: use Sentry error handler middleware

```ts
// In app.ts — add AFTER all routes, BEFORE custom error handler
import * as Sentry from '@sentry/node';
app.use(Sentry.Handlers.errorHandler());

// Then custom 500 handler
app.use((err, req, res, next) => { ... });
```

Replace the inline `require('@sentry/node')` in the error handler with the proper middleware.

---

## Alert Configuration Recommendations

| Alert                               | Condition                          | Destination          |
| ----------------------------------- | ---------------------------------- | -------------------- |
| High error rate                     | > 10 errors/min                    | Email + Telegram bot |
| New issue                           | Any new unhandled exception        | Email                |
| Performance regression              | p95 response > 2s                  | Email                |
| Backend crash (unhandled rejection) | `process.on('unhandledRejection')` | Sentry + Telegram    |

---

## Sentry Project Setup Checklist

- [ ] Create Sentry project for `promo-effect-frontend` (React)
- [ ] Create Sentry project for `promo-effect-backend` (Node.js)
- [ ] Add DSN to `.env.production` and server `.env`
- [ ] Add `SENTRY_AUTH_TOKEN` to GitHub Secrets
- [ ] Enable `Performance` monitoring (tracing)
- [ ] Set Issue Alerts (email + Telegram webhook)
- [ ] Enable `Replays` for frontend (helpful for debugging client-side issues)
