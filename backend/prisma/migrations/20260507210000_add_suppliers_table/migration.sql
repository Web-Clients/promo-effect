-- CreateTable: suppliers (reusable Chinese supplier records)
CREATE TABLE "suppliers" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT,
    "contact" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "website" TEXT,
    "country" TEXT DEFAULT 'China',
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "suppliers_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "suppliers_name_key" ON "suppliers"("name");
CREATE INDEX "suppliers_name_idx" ON "suppliers"("name");

-- AlterTable: add supplier_id FK to bookings
ALTER TABLE "bookings" ADD COLUMN "supplier_id" TEXT;

-- CreateIndex on bookings.supplier_id
CREATE INDEX "bookings_supplier_id_idx" ON "bookings"("supplier_id");

-- AddForeignKey
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_supplier_id_fkey" FOREIGN KEY ("supplier_id") REFERENCES "suppliers"("id") ON DELETE SET NULL ON UPDATE CASCADE;
