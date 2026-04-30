# G4 — API Response Caching Strategy

**Date:** 2026-04-30
**Status:** Partial (in-memory cache already exists for booking stats and HS codes)

---

## Existing Cache

| Location                                                 | TTL             | Notes                               |
| -------------------------------------------------------- | --------------- | ----------------------------------- |
| `backend/src/modules/bookings/bookings-stats.service.ts` | 30s in-memory   | Per-tab booking counts + USD totals |
| `backend/src/modules/calculator/` (HS codes)             | 30min in-memory | HS code lookups                     |

---

## Endpoints Recommended for Caching

### /api/ports/list — TTL: 1 hour

Port data (Shanghai, Constanta, Odessa, etc.) changes only when admin explicitly updates.

```ts
// In ports.service.ts — wrap getAll() with in-memory cache
const portsCache = new Map<string, { data: any; expiresAt: number }>();
const PORTS_TTL = 60 * 60 * 1000; // 1h

async getAll(type?: PortType, includeInactive = false) {
  const key = `${type ?? 'all'}:${includeInactive}`;
  const cached = portsCache.get(key);
  if (cached && Date.now() < cached.expiresAt) return cached.data;

  const data = await prisma.port.findMany({ ... });
  portsCache.set(key, { data, expiresAt: Date.now() + PORTS_TTL });
  return data;
}

// Invalidate on create/update/delete:
portsCache.clear();
```

### /api/shipping-lines/list — TTL: 1 hour

Shipping line names rarely change. Same pattern as ports.

### /api/admin/stats — TTL: 5 minutes

Admin dashboard aggregates (total bookings, revenue). 5 min acceptable lag.

### /api/hscodes/search — TTL: 30 minutes (already implemented)

HS code lookups are read-only reference data.

---

## Cache Invalidation Triggers

| Cache                | Invalidated when                                                                                          |
| -------------------- | --------------------------------------------------------------------------------------------------------- |
| Ports cache          | Admin creates/updates/deletes a port (`POST /api/ports`, `PATCH /api/ports/:id`, `DELETE /api/ports/:id`) |
| Shipping lines cache | Admin creates/updates/deletes a shipping line                                                             |
| Booking stats cache  | Any booking is created, updated, or archived (status change)                                              |
| Admin stats cache    | Booking status change, invoice status change                                                              |

**Rule:** Always call `cache.clear()` (or the specific key delete) inside the mutation service methods — not the controller.

---

## Redis vs In-Memory

### Current: No Redis configured

Backend uses in-memory `Map` for idempotency middleware with Redis as optional upgrade.

**For now:** Use in-memory Map with TTL (same pattern as booking stats). Acceptable for single-instance deployment.

### When to add Redis

- If the app scales to 2+ Node processes / replicas
- If cache must survive process restarts
- If TTL precision matters

Redis implementation (ioredis):

```ts
import Redis from 'ioredis';
const redis = new Redis(process.env.REDIS_URL);

// Cache set with TTL
await redis.set(key, JSON.stringify(data), 'EX', 3600); // 1h

// Cache get
const raw = await redis.get(key);
if (raw) return JSON.parse(raw);
```

Install: `npm install ioredis && npm install --save-dev @types/ioredis`

---

## HTTP Cache Headers (Nginx)

For read-only reference data endpoints, add `Cache-Control` headers:

```nginx
location /api/ports/list {
  proxy_pass http://localhost:4000;
  add_header Cache-Control "public, max-age=3600, stale-while-revalidate=300";
}

location /api/shipping-lines/list {
  proxy_pass http://localhost:4000;
  add_header Cache-Control "public, max-age=3600, stale-while-revalidate=300";
}
```

This allows CDN / browser to cache static reference data without hitting the Node process.

---

## TTL Summary Table

| Endpoint                   | In-memory TTL | HTTP Cache-Control | Notes                    |
| -------------------------- | ------------- | ------------------ | ------------------------ |
| `/api/ports/list`          | 1h            | max-age=3600       | Read-only ref data       |
| `/api/shipping-lines/list` | 1h            | max-age=3600       | Read-only ref data       |
| `/api/bookings/stats`      | 30s           | no-store           | User-specific aggregates |
| `/api/admin/stats`         | 5min          | no-store           | Admin only               |
| `/api/hscodes/search`      | 30min         | max-age=1800       | Read-only ref data       |
| `/api/calculator/rates`    | 15min         | max-age=900        | Pricing data             |
