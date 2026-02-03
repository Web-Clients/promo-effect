-- CreateTable
CREATE TABLE "hs_codes" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "description_en" TEXT,
    "chapter" TEXT NOT NULL,
    "heading" TEXT NOT NULL,
    "subheading" TEXT,
    "duty_rate" DOUBLE PRECISION,
    "vat_rate" DOUBLE PRECISION DEFAULT 20,
    "requires_inspection" BOOLEAN NOT NULL DEFAULT false,
    "requires_license" BOOLEAN NOT NULL DEFAULT false,
    "restrictions" TEXT,
    "keywords" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "hs_codes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "hs_codes_code_key" ON "hs_codes"("code");

-- CreateIndex
CREATE INDEX "hs_codes_code_idx" ON "hs_codes"("code");

-- CreateIndex
CREATE INDEX "hs_codes_chapter_idx" ON "hs_codes"("chapter");

-- CreateIndex
CREATE INDEX "hs_codes_heading_idx" ON "hs_codes"("heading");

-- CreateIndex
CREATE INDEX "hs_codes_is_active_idx" ON "hs_codes"("is_active");
