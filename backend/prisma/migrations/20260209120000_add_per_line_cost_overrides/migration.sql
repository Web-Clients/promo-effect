-- AlterTable
ALTER TABLE "base_prices" ADD COLUMN "port_taxes" DOUBLE PRECISION;
ALTER TABLE "base_prices" ADD COLUMN "terrestrial_transport" DOUBLE PRECISION;
ALTER TABLE "base_prices" ADD COLUMN "customs_taxes" DOUBLE PRECISION;
ALTER TABLE "base_prices" ADD COLUMN "commission" DOUBLE PRECISION;
