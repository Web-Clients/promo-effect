-- Three tables live in production but were never in the migration history: they
-- were created by hand with SQL. `prisma migrate deploy` on a fresh server built
-- a database the app cannot run on — shipping_line_containers is where the
-- per-line Constanța port taxes come from ($520 Maersk / $700 CMA CGM), so every
-- quote would silently fall back to the generic admin setting.
--
-- Found on 3 Sep 2026 while standing up a local database from the migrations
-- alone. IF NOT EXISTS everywhere, so this is a no-op on the running server.

CREATE TABLE IF NOT EXISTS "ports" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT,
    "country" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ports_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "ports_name_type_key" ON "ports"("name", "type");
CREATE INDEX IF NOT EXISTS "ports_type_idx" ON "ports"("type");
CREATE INDEX IF NOT EXISTS "ports_is_active_idx" ON "ports"("is_active");

CREATE TABLE IF NOT EXISTS "shipping_line_containers" (
    "id" TEXT NOT NULL,
    "shipping_line" TEXT NOT NULL,
    "container_type" TEXT NOT NULL,
    "port_taxes" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "shipping_line_containers_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "shipping_line_containers_shipping_line_container_type_key"
    ON "shipping_line_containers"("shipping_line", "container_type");
CREATE INDEX IF NOT EXISTS "shipping_line_containers_shipping_line_idx"
    ON "shipping_line_containers"("shipping_line");
CREATE INDEX IF NOT EXISTS "shipping_line_containers_is_active_idx"
    ON "shipping_line_containers"("is_active");

CREATE TABLE IF NOT EXISTS "transport_rates" (
    "id" TEXT NOT NULL,
    "container_type" TEXT NOT NULL,
    "weight_range" TEXT NOT NULL,
    "destination" TEXT NOT NULL DEFAULT 'Constanța',
    "rate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "transport_rates_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "transport_rates_container_type_weight_range_destination_key"
    ON "transport_rates"("container_type", "weight_range", "destination");
CREATE INDEX IF NOT EXISTS "transport_rates_destination_idx" ON "transport_rates"("destination");
CREATE INDEX IF NOT EXISTS "transport_rates_is_active_idx" ON "transport_rates"("is_active");
