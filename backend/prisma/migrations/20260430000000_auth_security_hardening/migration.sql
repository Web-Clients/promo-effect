-- Migration: auth_security_hardening
-- Tasks: B1 (token rotation family), B7 (password reset single-use table), B9 (verification token hash)

-- B1: Add refresh token rotation columns to sessions table
ALTER TABLE "sessions"
  ADD COLUMN "token_family"  TEXT,
  ADD COLUMN "revoked"       BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN "revoked_at"    TIMESTAMP(3);

CREATE INDEX "sessions_token_family_idx" ON "sessions"("token_family");

-- B7: Dedicated password reset tokens table (replaces inline resetToken on users)
CREATE TABLE "password_reset_tokens" (
  "id"         TEXT NOT NULL,
  "user_id"    TEXT NOT NULL,
  "token_hash" TEXT NOT NULL,
  "expires_at" TIMESTAMP(3) NOT NULL,
  "used_at"    TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "password_reset_tokens_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "password_reset_tokens_token_hash_key" ON "password_reset_tokens"("token_hash");
CREATE INDEX "password_reset_tokens_user_id_idx" ON "password_reset_tokens"("user_id");
CREATE INDEX "password_reset_tokens_expires_at_idx" ON "password_reset_tokens"("expires_at");

ALTER TABLE "password_reset_tokens"
  ADD CONSTRAINT "password_reset_tokens_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- B9: Add verification token hash column to users (store hash, not plain token)
ALTER TABLE "users"
  ADD COLUMN "verification_token_hash" TEXT;

CREATE UNIQUE INDEX "users_verification_token_hash_key" ON "users"("verification_token_hash");
