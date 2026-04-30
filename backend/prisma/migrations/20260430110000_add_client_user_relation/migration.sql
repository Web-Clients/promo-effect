-- Add userId to Client (nullable, unique) for user-client relationship (Phase 5)
ALTER TABLE "clients" ADD COLUMN "user_id" TEXT;
CREATE UNIQUE INDEX "clients_user_id_key" ON "clients"("user_id");
ALTER TABLE "clients" ADD CONSTRAINT "clients_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
