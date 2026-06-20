-- CreateEnum
CREATE TYPE "RefCategory" AS ENUM ('city', 'listing_type', 'budget_preset_seeker', 'budget_preset_lister', 'gender', 'bedroom');

-- CreateTable
CREATE TABLE "RefOption" (
    "id" TEXT NOT NULL,
    "category" "RefCategory" NOT NULL,
    "code" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "minValue" INTEGER,
    "maxValue" INTEGER,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RefOption_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "RefOption_category_sortOrder_idx" ON "RefOption"("category", "sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "RefOption_category_code_key" ON "RefOption"("category", "code");
