# A21 — Pricing Schema Migration Plan

**Status:** DO NOT EXECUTE — Review required before running migrations  
**Date:** 2026-04-30  
**Scope:** BasePrice restructuring, PortAdjustment, WeightRange models

---

## Current State

- `BasePrice` has `portOrigin`, `portDestination`, `shippingLine`, `containerType`, `basePrice`
- `PortAdjustment` exists with `portName` and `adjustment` (single global +/- per port)
- Weight surcharges stored as JSON in `AdminSettings.weightRanges` — not a proper table
- No per-container-type weight ranges

---

## 1. BasePrice — New Semantic (no schema change needed)

The **existing** `BasePrice` schema supports the "one base port" model:

- Admin sets Shanghai as the one base port
- Each row = `shippingLine × containerType` combination with `basePrice`
- Destination ports (Constanța, Odessa) remain as-is

**No migration needed.** UI just needs to filter/group by `portOrigin = 'Shanghai'`.

However, if you want to **enforce** single base port at DB level:

```sql
-- Option: add a constraint that only one portOrigin is allowed at a time
-- Not recommended; better handle in app logic
```

---

## 2. PortAdjustment Model — Enhanced

Current model (`PortAdjustment`):

```prisma
model PortAdjustment {
  id         String   @id @default(cuid())
  portName   String   @unique
  adjustment Float    @default(0)
  notes      String?
  createdAt  DateTime @default(now())
  updatedAt  DateTime @updatedAt
}
```

**Change needed:** Add `portDestination` to support per-route adjustments (Ningbo → Constanța vs Ningbo → Odessa may have different surcharges).

### SQL Migration:

```sql
ALTER TABLE "PortAdjustment" ADD COLUMN IF NOT EXISTS "portDestination" TEXT DEFAULT 'Constanța';
ALTER TABLE "PortAdjustment" ADD COLUMN IF NOT EXISTS "containerType" TEXT DEFAULT NULL;
ALTER TABLE "PortAdjustment" DROP CONSTRAINT IF EXISTS "PortAdjustment_portName_key";
CREATE UNIQUE INDEX IF NOT EXISTS "PortAdjustment_portName_dest_container_key"
  ON "PortAdjustment"("portName", "portDestination", COALESCE("containerType", ''));
```

### Prisma schema change:

```prisma
model PortAdjustment {
  id              String   @id @default(cuid())
  portName        String
  portDestination String   @default("Constanța")
  containerType   String?  // null = applies to all container types
  adjustment      Float    @default(0)
  notes           String?
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  @@unique([portName, portDestination, containerType])
}
```

---

## 3. WeightRange Model — New Table

Currently stored as JSON in `AdminSettings.weightRanges`. Needs a proper table for per-container-type ranges.

### 7 weight ranges × 8 container types = 56 rows seed data

```prisma
model WeightRange {
  id                   String   @id @default(cuid())
  containerType        String   // 20DV, 40DV, 40HQ, 45HQ, 20OT, 40OT, 20RF, 40RF
  label                String   // "1-18 tone"
  minWeight            Float
  maxWeight            Float
  freightSurcharge     Float    @default(0)
  terrestrialSurcharge Float    @default(0)
  enabled              Boolean  @default(true)
  sortOrder            Int      @default(0)
  createdAt            DateTime @default(now())
  updatedAt            DateTime @updatedAt

  @@unique([containerType, label])
  @@index([containerType])
}
```

### SQL Migration:

```sql
CREATE TABLE IF NOT EXISTS "WeightRange" (
  "id"                   TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "containerType"        TEXT NOT NULL,
  "label"                TEXT NOT NULL,
  "minWeight"            DOUBLE PRECISION NOT NULL,
  "maxWeight"            DOUBLE PRECISION NOT NULL,
  "freightSurcharge"     DOUBLE PRECISION NOT NULL DEFAULT 0,
  "terrestrialSurcharge" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "enabled"              BOOLEAN NOT NULL DEFAULT true,
  "sortOrder"            INTEGER NOT NULL DEFAULT 0,
  "createdAt"            TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"            TIMESTAMP(3) NOT NULL,
  PRIMARY KEY ("id"),
  UNIQUE ("containerType", "label")
);

CREATE INDEX IF NOT EXISTS "WeightRange_containerType_idx" ON "WeightRange"("containerType");
```

### Seed Data (56 rows — 8 container types × 7 ranges):

```sql
INSERT INTO "WeightRange" ("containerType", "label", "minWeight", "maxWeight", "freightSurcharge", "terrestrialSurcharge", "enabled", "sortOrder", "updatedAt")
VALUES
-- 20DV
('20DV', '1-18 tone',   1,  18, 0,   0,   true, 1, NOW()),
('20DV', '18-23 tone', 18,  23, 50,  25,  true, 2, NOW()),
('20DV', '23-24 tone', 23,  24, 100, 50,  true, 3, NOW()),
('20DV', '24-25 tone', 24,  25, 150, 75,  true, 4, NOW()),
('20DV', '25-26 tone', 25,  26, 200, 100, true, 5, NOW()),
('20DV', '26-27 tone', 26,  27, 250, 125, true, 6, NOW()),
('20DV', '27-28 tone', 27,  28, 300, 150, true, 7, NOW()),
-- 40DV
('40DV', '1-18 tone',   1,  18, 0,   0,   true, 1, NOW()),
('40DV', '18-23 tone', 18,  23, 50,  25,  true, 2, NOW()),
('40DV', '23-24 tone', 23,  24, 100, 50,  true, 3, NOW()),
('40DV', '24-25 tone', 24,  25, 150, 75,  true, 4, NOW()),
('40DV', '25-26 tone', 25,  26, 200, 100, true, 5, NOW()),
('40DV', '26-27 tone', 26,  27, 250, 125, true, 6, NOW()),
('40DV', '27-28 tone', 27,  28, 300, 150, true, 7, NOW()),
-- 40HQ
('40HQ', '1-18 tone',   1,  18, 0,   0,   true, 1, NOW()),
('40HQ', '18-23 tone', 18,  23, 50,  25,  true, 2, NOW()),
('40HQ', '23-24 tone', 23,  24, 100, 50,  true, 3, NOW()),
('40HQ', '24-25 tone', 24,  25, 150, 75,  true, 4, NOW()),
('40HQ', '25-26 tone', 25,  26, 200, 100, true, 5, NOW()),
('40HQ', '26-27 tone', 26,  27, 250, 125, true, 6, NOW()),
('40HQ', '27-28 tone', 27,  28, 300, 150, true, 7, NOW()),
-- 45HQ
('45HQ', '1-18 tone',   1,  18, 0,   0,   true, 1, NOW()),
('45HQ', '18-23 tone', 18,  23, 75,  35,  true, 2, NOW()),
('45HQ', '23-24 tone', 23,  24, 125, 65,  true, 3, NOW()),
('45HQ', '24-25 tone', 24,  25, 175, 85,  true, 4, NOW()),
('45HQ', '25-26 tone', 25,  26, 225, 110, true, 5, NOW()),
('45HQ', '26-27 tone', 26,  27, 275, 135, true, 6, NOW()),
('45HQ', '27-28 tone', 27,  28, 325, 160, true, 7, NOW()),
-- 20OT (Open Top)
('20OT', '1-18 tone',   1,  18, 0,   0,   true, 1, NOW()),
('20OT', '18-23 tone', 18,  23, 50,  25,  true, 2, NOW()),
('20OT', '23-24 tone', 23,  24, 100, 50,  true, 3, NOW()),
('20OT', '24-25 tone', 24,  25, 150, 75,  true, 4, NOW()),
('20OT', '25-26 tone', 25,  26, 200, 100, true, 5, NOW()),
('20OT', '26-27 tone', 26,  27, 250, 125, true, 6, NOW()),
('20OT', '27-28 tone', 27,  28, 300, 150, true, 7, NOW()),
-- 40OT (Open Top)
('40OT', '1-18 tone',   1,  18, 0,   0,   true, 1, NOW()),
('40OT', '18-23 tone', 18,  23, 50,  25,  true, 2, NOW()),
('40OT', '23-24 tone', 23,  24, 100, 50,  true, 3, NOW()),
('40OT', '24-25 tone', 24,  25, 150, 75,  true, 4, NOW()),
('40OT', '25-26 tone', 25,  26, 200, 100, true, 5, NOW()),
('40OT', '26-27 tone', 26,  27, 250, 125, true, 6, NOW()),
('40OT', '27-28 tone', 27,  28, 300, 150, true, 7, NOW()),
-- 20RF (Reefer)
('20RF', '1-18 tone',   1,  18, 0,   0,   true, 1, NOW()),
('20RF', '18-23 tone', 18,  23, 100, 50,  true, 2, NOW()),
('20RF', '23-24 tone', 23,  24, 200, 100, true, 3, NOW()),
('20RF', '24-25 tone', 24,  25, 300, 150, true, 4, NOW()),
('20RF', '25-26 tone', 25,  26, 400, 200, true, 5, NOW()),
('20RF', '26-27 tone', 26,  27, 500, 250, true, 6, NOW()),
('20RF', '27-28 tone', 27,  28, 600, 300, true, 7, NOW()),
-- 40RF (Reefer)
('40RF', '1-18 tone',   1,  18, 0,   0,   true, 1, NOW()),
('40RF', '18-23 tone', 18,  23, 100, 50,  true, 2, NOW()),
('40RF', '23-24 tone', 23,  24, 200, 100, true, 3, NOW()),
('40RF', '24-25 tone', 24,  25, 300, 150, true, 4, NOW()),
('40RF', '25-26 tone', 25,  26, 400, 200, true, 5, NOW()),
('40RF', '26-27 tone', 26,  27, 500, 250, true, 6, NOW()),
('40RF', '27-28 tone', 27,  28, 600, 300, true, 7, NOW())
ON CONFLICT ("containerType", "label") DO NOTHING;
```

---

## 4. Full-Text Search Index for HS Codes

```sql
-- Run ONCE after deploying:
CREATE INDEX IF NOT EXISTS idx_hscodes_search
ON hs_codes USING gin(to_tsvector('simple', code || ' ' || description));
```

---

## 5. Backfill Plan

1. Export existing `AdminSettings.weightRanges` JSON to file before migration
2. Run `WeightRange` table creation SQL above
3. Run seed INSERT above
4. Verify 56 rows in `WeightRange`
5. Update `calculator.service.ts` to query `WeightRange` table instead of JSON field
6. After 2 weeks of stable operation, set `AdminSettings.weightRanges = '[]'` to deprecate

---

## 6. HS Code Table Name Note

Prisma model is `HsCode` which maps to `hs_codes` table. Verify exact table name:

```sql
SELECT tablename FROM pg_tables WHERE tablename LIKE '%hs%';
```

Adjust index creation SQL if table name differs.

---

## Order of Execution

1. `WeightRange` table creation + seed (safe, additive)
2. `PortAdjustment` schema change (requires Prisma migration)
3. HS Code full-text index (safe, additive)
4. Backfill WeightRange from JSON
5. Update service code to use `WeightRange` table
