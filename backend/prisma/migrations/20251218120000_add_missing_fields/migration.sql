-- AlterTable
ALTER TABLE "users" ADD COLUMN "last_login_ip" TEXT,
ADD COLUMN "language" TEXT DEFAULT 'ro',
ADD COLUMN "timezone" TEXT DEFAULT 'Europe/Chisinau',
ADD COLUMN "notification_preferences" TEXT,
ADD COLUMN "two_factor_enabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "two_factor_secret" TEXT,
ADD COLUMN "backup_codes" TEXT;

-- AlterTable
ALTER TABLE "clients" ADD COLUMN "payment_terms" INTEGER DEFAULT 30,
ADD COLUMN "credit_limit" DOUBLE PRECISION DEFAULT 0,
ADD COLUMN "current_balance" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN "discount" DOUBLE PRECISION DEFAULT 0,
ADD COLUMN "rating" DOUBLE PRECISION DEFAULT 5.0;

-- AlterTable
ALTER TABLE "containers" ADD COLUMN "bl_number" TEXT,
ADD COLUMN "weight_gross" DOUBLE PRECISION,
ADD COLUMN "weight_net" DOUBLE PRECISION,
ADD COLUMN "volume" DOUBLE PRECISION,
ADD COLUMN "content" TEXT,
ADD COLUMN "temperature_setting" DOUBLE PRECISION,
ADD COLUMN "ventilation_setting" TEXT,
ADD COLUMN "urgent" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "delayed" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "eta_original" TIMESTAMP(3),
ADD COLUMN "estimated_cost" DOUBLE PRECISION,
ADD COLUMN "additional_costs" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN "insurance_active" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "insurance_details" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "containers_bl_number_key" ON "containers"("bl_number");

-- AlterTable
ALTER TABLE "tracking_events" ADD COLUMN "unlocode" TEXT,
ADD COLUMN "voyage_number" TEXT,
ADD COLUMN "container_status" TEXT,
ADD COLUMN "details" TEXT,
ADD COLUMN "source" TEXT DEFAULT 'MANUAL_ENTRY',
ADD COLUMN "validated" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "visibility" TEXT DEFAULT 'PUBLIC';

-- AlterTable
ALTER TABLE "invoices" ADD COLUMN "vat_percent" DOUBLE PRECISION DEFAULT 0,
ADD COLUMN "vat_amount" DOUBLE PRECISION DEFAULT 0,
ADD COLUMN "total_amount" DOUBLE PRECISION NOT NULL,
ADD COLUMN "exchange_rate" DOUBLE PRECISION,
ADD COLUMN "payment_method" TEXT,
ADD COLUMN "discount" DOUBLE PRECISION DEFAULT 0,
ADD COLUMN "discount_amount" DOUBLE PRECISION DEFAULT 0,
ADD COLUMN "penalties" DOUBLE PRECISION DEFAULT 0,
ADD COLUMN "reminders_sent" TEXT;

-- AlterTable
ALTER TABLE "payments" ADD COLUMN "client_id" TEXT,
ADD COLUMN "reconciliation_status" TEXT NOT NULL DEFAULT 'PENDING';

-- AlterTable
ALTER TABLE "payments" ALTER COLUMN "invoice_id" DROP NOT NULL;

-- CreateTable
CREATE TABLE "settings" (
    "id" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "description" TEXT,
    "validation" TEXT,
    "updated_by" TEXT,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "settings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "settings_category_key_key" ON "settings"("category", "key");

-- CreateIndex
CREATE INDEX "settings_category_idx" ON "settings"("category");

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE SET NULL ON UPDATE CASCADE;

