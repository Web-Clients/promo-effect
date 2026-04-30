# G5 — Database Indexes

**Date:** 2026-04-30
**Status:** Audit of existing + recommended indexes

---

## Existing Indexes (from schema.prisma)

### Booking model — `@@index` already present:

- `[clientId]`
- `[agentId]`
- `[status]`
- `[archived]`
- `[blNumber]` — added Phase A1
- `[arrivalDateConstanta]` — added Phase A1
- `blNumber` field also has `@unique` constraint

### Invoice model:

- `[clientId]`
- `[status]`
- `[dueDate]`

### AuditLog model:

- `[userId]`
- `[entityType, entityId]`

---

## Missing Indexes — Recommended

### 1. Booking: compound `[status, createdAt]`

Used for tab queries (LA INCARCARE / IN DRUM / PORT / LIVRATE) ordered by creation date.

```sql
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_bookings_status_created
  ON bookings(status, created_at DESC);
```

Prisma schema addition:

```prisma
@@index([status, createdAt])
```

### 2. AuditLog: `[createdAt]`

Audit log queries are almost always ordered by date descending, with date range filters.

```sql
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_audit_logs_created
  ON audit_logs(created_at DESC);
```

Prisma schema addition:

```prisma
@@index([createdAt])
```

### 3. Invoice: compound `[status, dueDate]`

Overdue invoice queries filter on `status IN ('ISSUED','SENT','UNPAID')` AND `dueDate < NOW()`.

```sql
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_invoices_status_due
  ON invoices(status, due_date);
```

Prisma schema addition:

```prisma
@@index([status, dueDate])
```

### 4. Booking: compound `[archived, status, createdAt]`

Archive tab queries filter `archived=true` — adding `archived` to the compound reduces scan.

```sql
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_bookings_archived_status_created
  ON bookings(archived, status, created_at DESC);
```

### 5. AuditLog: compound `[entityType, createdAt]`

Entity-type audit history queries (e.g., all Booking audit events) ordered by date.

```sql
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_audit_logs_entity_type_created
  ON audit_logs(entity_type, created_at DESC);
```

---

## Migration SQL Templates

All use `CONCURRENTLY` to avoid locking the table in production.

```sql
-- Run as a migration or via psql directly on production

BEGIN;

-- Booking compound: status + created_at
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_bookings_status_created
  ON bookings(status, created_at DESC);

-- AuditLog: created_at
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_audit_logs_created
  ON audit_logs(created_at DESC);

-- Invoice compound: status + due_date
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_invoices_status_due
  ON invoices(status, due_date);

-- Booking compound: archived + status + created_at
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_bookings_archived_status_created
  ON bookings(archived, status, created_at DESC);

-- AuditLog compound: entity_type + created_at
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_audit_logs_entity_type_created
  ON audit_logs(entity_type, created_at DESC);

COMMIT;
```

> Note: `CREATE INDEX CONCURRENTLY` cannot run inside a transaction block in PostgreSQL.
> Run each statement separately when using CONCURRENTLY.

---

## Adding to Prisma Schema

After running the SQL above manually, add to `schema.prisma` to keep Prisma in sync:

```prisma
// Booking model
@@index([status, createdAt])
@@index([archived, status, createdAt])

// Invoice model
@@index([status, dueDate])

// AuditLog model
@@index([createdAt])
@@index([entityType, createdAt])
```

Then run `npx prisma db pull` or add a `prisma migrate` with the SQL above.
