-- AlterTable
ALTER TABLE "admin_settings" ADD COLUMN     "insurance_cost" DOUBLE PRECISION NOT NULL DEFAULT 50.00,
ADD COLUMN     "port_taxes_constanta" DOUBLE PRECISION NOT NULL DEFAULT 221.67,
ADD COLUMN     "port_taxes_odessa" DOUBLE PRECISION NOT NULL DEFAULT 200.00,
ADD COLUMN     "profit_margin_percent" DOUBLE PRECISION NOT NULL DEFAULT 10.0,
ADD COLUMN     "terrestrial_transport_constanta" DOUBLE PRECISION NOT NULL DEFAULT 600.00,
ADD COLUMN     "terrestrial_transport_odessa" DOUBLE PRECISION NOT NULL DEFAULT 550.00;

-- CreateTable
CREATE TABLE "base_prices" (
    "id" TEXT NOT NULL,
    "shipping_line" TEXT NOT NULL,
    "port_origin" TEXT NOT NULL,
    "port_destination" TEXT NOT NULL,
    "container_type" TEXT NOT NULL,
    "base_price" DOUBLE PRECISION NOT NULL,
    "transit_days" INTEGER NOT NULL,
    "valid_from" TIMESTAMP(3) NOT NULL,
    "valid_until" TIMESTAMP(3) NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" TEXT,

    CONSTRAINT "base_prices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "port_adjustments" (
    "id" TEXT NOT NULL,
    "port_name" TEXT NOT NULL,
    "adjustment" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "port_adjustments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "base_prices_port_origin_port_destination_container_type_idx" ON "base_prices"("port_origin", "port_destination", "container_type");

-- CreateIndex
CREATE INDEX "base_prices_shipping_line_idx" ON "base_prices"("shipping_line");

-- CreateIndex
CREATE INDEX "base_prices_is_active_idx" ON "base_prices"("is_active");

-- CreateIndex
CREATE UNIQUE INDEX "base_prices_shipping_line_port_origin_port_destination_cont_key" ON "base_prices"("shipping_line", "port_origin", "port_destination", "container_type");

-- CreateIndex
CREATE UNIQUE INDEX "port_adjustments_port_name_key" ON "port_adjustments"("port_name");
