-- Migration: booking_extended_fields
-- Phase A1: Extend Booking model with BL number, shipper/beneficiary, arrival date Constanta, telex/docs flags

-- Add new columns to bookings table
ALTER TABLE "bookings" ADD COLUMN IF NOT EXISTS "bl_number" TEXT UNIQUE;
ALTER TABLE "bookings" ADD COLUMN IF NOT EXISTS "shipper_name" TEXT;
ALTER TABLE "bookings" ADD COLUMN IF NOT EXISTS "beneficiary_name" TEXT;
ALTER TABLE "bookings" ADD COLUMN IF NOT EXISTS "arrival_date_constanta" TIMESTAMP(3);
ALTER TABLE "bookings" ADD COLUMN IF NOT EXISTS "telex_released" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "bookings" ADD COLUMN IF NOT EXISTS "documents_uploaded" BOOLEAN NOT NULL DEFAULT false;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS "bookings_bl_number_idx" ON "bookings"("bl_number");
CREATE INDEX IF NOT EXISTS "bookings_arrival_date_constanta_idx" ON "bookings"("arrival_date_constanta");
