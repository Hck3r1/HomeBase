-- CreateEnum
CREATE TYPE "Gender" AS ENUM ('male', 'female', 'prefer_not_to_say');

-- CreateEnum
CREATE TYPE "ListingInterest" AS ENUM ('rent', 'sale', 'shortstay');

-- AlterTable
ALTER TABLE "User" ADD COLUMN "dateOfBirth" TIMESTAMP(3),
ADD COLUMN "gender" "Gender",
ADD COLUMN "setupCompletedAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "UserPreference" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "listingTypes" "ListingInterest"[],
    "budgetMin" INTEGER,
    "budgetMax" INTEGER,
    "preferredCity" TEXT,
    "bedroomsMin" INTEGER,
    "serviceAreas" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserPreference_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "UserPreference_userId_key" ON "UserPreference"("userId");

-- AddForeignKey
ALTER TABLE "UserPreference" ADD CONSTRAINT "UserPreference_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
