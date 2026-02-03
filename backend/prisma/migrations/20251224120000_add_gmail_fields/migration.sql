-- AlterTable
ALTER TABLE "admin_settings" ADD COLUMN IF NOT EXISTS "gmail_access_token" TEXT,
ADD COLUMN IF NOT EXISTS "gmail_refresh_token" TEXT,
ADD COLUMN IF NOT EXISTS "gmail_token_expiry" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS "gmail_email" TEXT,
ADD COLUMN IF NOT EXISTS "last_email_fetch_at" TIMESTAMP(3);

