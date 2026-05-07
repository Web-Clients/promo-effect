-- P2 Bug 19: Update customsTaxes default from 150 to 180
-- P2 Bug 16: Add currency field to Booking model (all prices are USD)

-- Change default for future rows
ALTER TABLE "admin_settings" ALTER COLUMN "customs_taxes" SET DEFAULT 180.00;

-- Update the existing AdminSettings row (id=1) to new default
-- NOTE: Only apply if the current value is still at the old default (150)
-- Run manually on prod after confirming with team:
-- UPDATE admin_settings SET customs_taxes = 180 WHERE id = 1 AND customs_taxes = 150;

-- Add currency column to bookings (default USD, non-breaking)
ALTER TABLE "bookings" ADD COLUMN IF NOT EXISTS "currency" TEXT NOT NULL DEFAULT 'USD';

-- Bug 22 (FUTURE/OPTIONAL): allocatedPrice per container
ALTER TABLE "containers" ADD COLUMN IF NOT EXISTS "allocated_price" DOUBLE PRECISION;

-- Bug 19: Update existing AdminSettings row (APPLY MANUALLY after confirming):
-- UPDATE admin_settings SET customs_taxes = 180 WHERE id = 1 AND customs_taxes = 150;
