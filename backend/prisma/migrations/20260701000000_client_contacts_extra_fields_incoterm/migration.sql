-- Client extra business fields (were added live via SQL; formalized here so a
-- fresh `prisma migrate deploy` on a new server recreates them).
ALTER TABLE "clients" ADD COLUMN IF NOT EXISTS "vat_code" TEXT;
ALTER TABLE "clients" ADD COLUMN IF NOT EXISTS "bank_name" TEXT;
ALTER TABLE "clients" ADD COLUMN IF NOT EXISTS "swift" TEXT;

-- Booking incoterm (FOB/EXW/CFR/CIF)
ALTER TABLE "bookings" ADD COLUMN IF NOT EXISTS "incoterm" TEXT;

-- Multiple contact persons per client (director, logist…) with a subscribe flag.
CREATE TABLE IF NOT EXISTS "client_contacts" (
    "id" TEXT NOT NULL,
    "client_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "subscribed" BOOLEAN NOT NULL DEFAULT true,
    "is_primary" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "client_contacts_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "client_contacts_client_id_idx" ON "client_contacts"("client_id");

DO $$ BEGIN
    ALTER TABLE "client_contacts"
        ADD CONSTRAINT "client_contacts_client_id_fkey"
        FOREIGN KEY ("client_id") REFERENCES "clients"("id")
        ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
