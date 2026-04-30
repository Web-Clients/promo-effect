-- Add last_email_fetch_result for storing Gmail fetch outcomes
ALTER TABLE "admin_settings" ADD COLUMN IF NOT EXISTS "last_email_fetch_result" TEXT;
