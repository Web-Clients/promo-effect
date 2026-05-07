-- Migration: add_three_additional_charges
-- Extends Booking with 2 extra additional charge slots + optional labels for all 3

ALTER TABLE "bookings"
  ADD COLUMN IF NOT EXISTS "additional_charges_label"   TEXT,
  ADD COLUMN IF NOT EXISTS "additional_charges_2"       DOUBLE PRECISION NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "additional_charges_2_label" TEXT,
  ADD COLUMN IF NOT EXISTS "additional_charges_3"       DOUBLE PRECISION NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "additional_charges_3_label" TEXT;
