-- Migration: add_additional_charges_to_booking
-- Replace "Ajustare Port" concept with "Cheltuieli Adiționale" (additional charges)
-- Default 0 so existing bookings are unaffected

ALTER TABLE "bookings" ADD COLUMN IF NOT EXISTS "additional_charges" DOUBLE PRECISION NOT NULL DEFAULT 0;
