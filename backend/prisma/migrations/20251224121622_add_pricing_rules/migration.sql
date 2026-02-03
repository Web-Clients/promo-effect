-- DropForeignKey
ALTER TABLE "payments" DROP CONSTRAINT "payments_invoice_id_fkey";

-- AlterTable
ALTER TABLE "containers" ALTER COLUMN "additional_costs" DROP NOT NULL;

-- AlterTable
ALTER TABLE "invoices" ALTER COLUMN "status" SET DEFAULT 'DRAFT';

-- CreateTable
CREATE TABLE "pricing_rules" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "container_type" TEXT,
    "port_origin" TEXT,
    "port_destination" TEXT,
    "shipping_line" TEXT,
    "base_price" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "additional_taxes" TEXT,
    "volume_discounts" TEXT,
    "valid_from" TIMESTAMP(3) NOT NULL,
    "valid_to" TIMESTAMP(3),
    "special_conditions" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "notes" TEXT,
    "created_by" TEXT,
    "updated_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pricing_rules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "incoming_emails" (
    "id" TEXT NOT NULL,
    "message_id" TEXT NOT NULL,
    "from_address" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "received_at" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "processed_at" TIMESTAMP(3),
    "booking_id" TEXT,
    "extracted_data" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "incoming_emails_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "pricing_rules_container_type_port_origin_shipping_line_idx" ON "pricing_rules"("container_type", "port_origin", "shipping_line");

-- CreateIndex
CREATE INDEX "pricing_rules_status_valid_from_valid_to_idx" ON "pricing_rules"("status", "valid_from", "valid_to");

-- CreateIndex
CREATE INDEX "pricing_rules_priority_idx" ON "pricing_rules"("priority");

-- CreateIndex
CREATE UNIQUE INDEX "incoming_emails_message_id_key" ON "incoming_emails"("message_id");

-- CreateIndex
CREATE INDEX "incoming_emails_status_idx" ON "incoming_emails"("status");

-- CreateIndex
CREATE INDEX "incoming_emails_received_at_idx" ON "incoming_emails"("received_at");

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_invoice_id_fkey" FOREIGN KEY ("invoice_id") REFERENCES "invoices"("id") ON DELETE SET NULL ON UPDATE CASCADE;
