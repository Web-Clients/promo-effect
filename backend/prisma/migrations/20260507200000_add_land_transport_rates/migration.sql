-- Migration: add_land_transport_rates
-- Creates table for land (terrestrial) transport pricing matrix.
-- IMPORT = Port → Moldova destination city
-- EXPORT = Moldova origin city → Port
-- Columns: direction, city, weight_min, weight_max, weight_label, price_usd, notes, active

CREATE TABLE IF NOT EXISTS "land_transport_rates" (
  "id"           UUID NOT NULL DEFAULT gen_random_uuid(),
  "direction"    TEXT NOT NULL,                              -- 'IMPORT' or 'EXPORT'
  "city"         TEXT NOT NULL,                              -- 'Chișinău', 'Bălți', etc.
  "weight_min"   DOUBLE PRECISION NOT NULL,                  -- 0 for <23, 23 for 23-24, etc.
  "weight_max"   DOUBLE PRECISION NOT NULL,                  -- 23, 24, 25, 26, 27, 28
  "weight_label" TEXT NOT NULL,                              -- '<23 mt', '23-24 mt', etc.
  "price_usd"    DOUBLE PRECISION NOT NULL,
  "notes"        TEXT,                                       -- 'through Leușeni' etc.
  "active"       BOOLEAN NOT NULL DEFAULT true,
  "created_at"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "land_transport_rates_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "land_transport_rates_direction_city_weight_key"
    UNIQUE ("direction", "city", "weight_min", "weight_max")
);

CREATE INDEX IF NOT EXISTS "land_transport_rates_direction_city_idx"
  ON "land_transport_rates"("direction", "city");
