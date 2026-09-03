-- Columns and indexes that exist on the running server but were never in the
-- migration history — added live with SQL over the months. A fresh
-- `prisma migrate deploy` produced a database the app crashes on: placing an
-- order died with `The column bookings.port_transit does not exist`.
--
-- Everything here is additive and idempotent, so it is a no-op on production.
--
-- Deliberately NOT included, though `prisma migrate diff` asks for them:
--   * land_transport_rates.id / port_pricing_matrix.id are `uuid` on the server
--     while the datamodel says String. Prisma reads and writes them fine as
--     text; rewriting a primary key's type on a live table to silence a
--     cosmetic diff is not worth the risk.
--   * The matching index renames, for the same reason.
-- Both remain as known, harmless drift.

ALTER TABLE "bookings"
  ADD COLUMN IF NOT EXISTS "archived" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "demurrage_days" INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "demurrage_fees" DOUBLE PRECISION DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "forwarding_fees" DOUBLE PRECISION DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "last_gps_lat" DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS "last_gps_lng" DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS "last_gps_speed" DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS "last_gps_update" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "port_transit" TEXT,
  ADD COLUMN IF NOT EXISTS "storage_days" INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "storage_fees" DOUBLE PRECISION DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "tracking_started_at" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "tracking_vehicle_id" TEXT,
  ADD COLUMN IF NOT EXISTS "tracking_vehicle_name" TEXT,
  ADD COLUMN IF NOT EXISTS "verification_fees" DOUBLE PRECISION DEFAULT 0;

CREATE INDEX IF NOT EXISTS "bookings_archived_idx" ON "bookings"("archived");

ALTER TABLE "agent_prices"
  ADD COLUMN IF NOT EXISTS "approval_status" TEXT NOT NULL DEFAULT 'APPROVED',
  ADD COLUMN IF NOT EXISTS "approved_at" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "approved_by" TEXT,
  ADD COLUMN IF NOT EXISTS "rejection_reason" TEXT;

CREATE INDEX IF NOT EXISTS "agent_prices_approval_status_idx"
  ON "agent_prices"("approval_status");

ALTER TABLE "incoming_emails"
  ADD COLUMN IF NOT EXISTS "attachments" TEXT,
  ADD COLUMN IF NOT EXISTS "pdf_text" TEXT;
