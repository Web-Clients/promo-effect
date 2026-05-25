-- ETA reminder upgrades + beneficiary PDF forwarding (meet 7 mai 2026)

ALTER TABLE "bookings"
  ADD COLUMN IF NOT EXISTS "last_notified_eta" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "beneficiary_pdf_url" TEXT,
  ADD COLUMN IF NOT EXISTS "beneficiary_pdf_name" TEXT;

ALTER TABLE "notifications"
  ADD COLUMN IF NOT EXISTS "severity" TEXT NOT NULL DEFAULT 'INFO';

CREATE INDEX IF NOT EXISTS "notifications_severity_idx" ON "notifications"("severity");
