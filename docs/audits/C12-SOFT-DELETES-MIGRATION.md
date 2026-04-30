# C12 — Soft Deletes Migration Plan

**Status:** PLAN ONLY — schema.prisma NOT modified yet. Apply after QA sign-off.

---

## 1. Prisma Schema Changes

Add `deletedAt DateTime?` to models that need soft deletion:

```prisma
model Booking {
  // ... existing fields ...
  deletedAt DateTime?  // null = active, set = soft-deleted
}

model Invoice {
  // ... existing fields ...
  deletedAt DateTime?
}

model Client {
  // ... existing fields ...
  deletedAt DateTime?
}

model User {
  // ... existing fields ...
  deletedAt DateTime?
}
```

---

## 2. Migration SQL

```sql
-- Add deletedAt columns
ALTER TABLE "Booking"  ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMP(3);
ALTER TABLE "Invoice"  ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMP(3);
ALTER TABLE "Client"   ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMP(3);
ALTER TABLE "User"     ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMP(3);

-- Indexes for fast filtering on non-deleted records
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_booking_deleted_at  ON "Booking"  ("deletedAt") WHERE "deletedAt" IS NULL;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_invoice_deleted_at  ON "Invoice"  ("deletedAt") WHERE "deletedAt" IS NULL;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_client_deleted_at   ON "Client"   ("deletedAt") WHERE "deletedAt" IS NULL;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_deleted_at     ON "User"     ("deletedAt") WHERE "deletedAt" IS NULL;
```

Prisma migration file name: `20260501000000_add_soft_deletes`

---

## 3. Prisma Middleware (automatic filtering)

Add to `backend/src/lib/prisma.ts` before `export default prisma`:

```ts
// Soft delete middleware — auto-filters deletedAt records from find* queries
prisma.$use(async (params, next) => {
  const SOFT_DELETE_MODELS = ['Booking', 'Invoice', 'Client', 'User'] as const;

  if (!SOFT_DELETE_MODELS.includes(params.model as any)) {
    return next(params);
  }

  // findMany / findFirst / findUnique — exclude soft-deleted
  if (
    ['findMany', 'findFirst', 'findUnique', 'findFirstOrThrow', 'findUniqueOrThrow'].includes(
      params.action
    )
  ) {
    params.args = params.args ?? {};
    params.args.where = params.args.where ?? {};
    // Preserve existing where, add deletedAt: null unless caller explicitly opts in
    if (!('includeDeleted' in params.args.where)) {
      params.args.where.deletedAt = null;
    } else {
      // Remove the opt-in flag before passing to DB
      delete params.args.where.includeDeleted;
    }
  }

  // count — exclude soft-deleted
  if (params.action === 'count') {
    params.args = params.args ?? {};
    params.args.where = { ...params.args.where, deletedAt: null };
  }

  // Rewrite DELETE → soft delete (set deletedAt)
  if (params.action === 'delete') {
    params.action = 'update';
    params.args.data = { deletedAt: new Date() };
  }

  // Rewrite deleteMany → soft deleteMany
  if (params.action === 'deleteMany') {
    params.action = 'updateMany';
    params.args.data = { deletedAt: new Date() };
  }

  return next(params);
});
```

### Opt-in to include soft-deleted records:

```ts
// Explicit opt-in to see deleted records
const allBookings = await prisma.booking.findMany({
  where: { includeDeleted: true } as any,
});
```

---

## 4. Admin Hard Delete Endpoint

```ts
// backend/src/modules/admin/admin-hard-delete.routes.ts

router.delete(
  '/hard-delete/:model/:id',
  requireRole(['SUPER_ADMIN']),
  async (req: Request, res: Response) => {
    const { model, id } = req.params;
    const ALLOWED_MODELS = ['booking', 'invoice', 'client', 'user'] as const;

    if (!ALLOWED_MODELS.includes(model as any)) {
      return res.status(400).json({ error: 'Model not allowed for hard delete' });
    }

    // Audit log first
    await prisma.auditLog.create({
      data: {
        entityType: model.toUpperCase(),
        entityId: id,
        action: 'HARD_DELETE',
        changes: JSON.stringify({ deletedBy: req.user!.id, timestamp: new Date() }),
      },
    });

    // Hard delete via $executeRaw to bypass middleware
    await prisma.$executeRaw`
      DELETE FROM ${Prisma.raw(`"${model.charAt(0).toUpperCase() + model.slice(1)}"`)}"
      WHERE id = ${id}
    `;

    res.json({ success: true, message: `Hard deleted ${model} ${id}` });
  }
);
```

---

## 5. Frontend Consideration

- All existing API calls remain unchanged (middleware filters automatically).
- To show "archived/deleted" items in admin: pass `{ includeDeleted: true }` in query.
- `DELETE /api/bookings/:id` should now call soft-delete by default; hard delete only via `/api/admin/hard-delete/booking/:id` (SUPER_ADMIN only).

---

## 6. Rollback Plan

```sql
-- Remove soft delete columns (only if no data was soft-deleted yet)
ALTER TABLE "Booking"  DROP COLUMN IF EXISTS "deletedAt";
ALTER TABLE "Invoice"  DROP COLUMN IF EXISTS "deletedAt";
ALTER TABLE "Client"   DROP COLUMN IF EXISTS "deletedAt";
ALTER TABLE "User"     DROP COLUMN IF EXISTS "deletedAt";
```

---

## 7. Estimated Effort

| Step                             | Time     |
| -------------------------------- | -------- |
| Prisma schema update + migration | 30 min   |
| Middleware implementation        | 1 h      |
| Update existing delete endpoints | 2 h      |
| Admin hard delete endpoint       | 1 h      |
| Tests                            | 2 h      |
| **Total**                        | **~6 h** |
