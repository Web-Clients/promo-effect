-- Migration: add_port_pricing_matrix
-- Creates a new table for the spreadsheet-like port × container_type adjustment matrix.
-- This REPLACES the old port_adjustments table for the new UI; old table is preserved for backward compatibility.

CREATE TABLE IF NOT EXISTS "port_pricing_matrix" (
  "id"             UUID NOT NULL DEFAULT gen_random_uuid(),
  "port_name"      TEXT NOT NULL,
  "container_type" TEXT NOT NULL,
  "adjustment"     DOUBLE PRECISION NOT NULL DEFAULT 0,
  "created_at"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "port_pricing_matrix_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "port_pricing_matrix_port_ct_key" UNIQUE ("port_name", "container_type")
);

CREATE INDEX IF NOT EXISTS "port_pricing_matrix_port_name_idx" ON "port_pricing_matrix"("port_name");

-- Seed the matrix from the existing port_adjustments table (single adjustment per port → apply to all container types)
INSERT INTO "port_pricing_matrix" ("port_name", "container_type", "adjustment")
SELECT
  pa."port_name",
  ct."container_type",
  pa."adjustment"
FROM "port_adjustments" pa
CROSS JOIN (
  VALUES ('20DV'), ('40DV'), ('40HQ'), ('45HQ'), ('20OT'), ('40OT'), ('20RF'), ('40RF')
) AS ct("container_type")
ON CONFLICT ("port_name", "container_type") DO NOTHING;
