-- Add AIS vessel-tracking fields to Container. Backfills the AISStream
-- integration that replaces SeaRates.

ALTER TABLE "containers"
  ADD COLUMN "vessel_mmsi" TEXT,
  ADD COLUMN "vessel_imo" TEXT,
  ADD COLUMN "vessel_name" TEXT,
  ADD COLUMN "vessel_sog" DOUBLE PRECISION,
  ADD COLUMN "vessel_cog" DOUBLE PRECISION,
  ADD COLUMN "vessel_heading" DOUBLE PRECISION,
  ADD COLUMN "vessel_pos_at" TIMESTAMP(3);

CREATE INDEX "containers_vessel_mmsi_idx" ON "containers"("vessel_mmsi");
