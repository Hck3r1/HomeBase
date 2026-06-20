-- CreateEnum
CREATE TYPE "ListingType" AS ENUM ('rent', 'sale', 'shortstay');

-- CreateEnum
CREATE TYPE "ListingStatus" AS ENUM ('draft', 'active', 'paused', 'rented', 'sold');

-- CreateTable
CREATE TABLE "Listing" (
    "id" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "listingType" "ListingType" NOT NULL,
    "status" "ListingStatus" NOT NULL DEFAULT 'active',
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "propertyType" TEXT NOT NULL,
    "bedrooms" INTEGER NOT NULL DEFAULT 0,
    "bathrooms" INTEGER NOT NULL DEFAULT 0,
    "areaSqm" INTEGER,
    "amenities" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "address" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "lat" DOUBLE PRECISION NOT NULL,
    "lng" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Listing_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ListingPhoto" (
    "id" TEXT NOT NULL,
    "listingId" TEXT NOT NULL,
    "cloudinaryPublicId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ListingPhoto_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ListingRentDetails" (
    "listingId" TEXT NOT NULL,
    "monthlyRent" INTEGER,
    "annualRent" INTEGER,
    "securityDeposit" INTEGER NOT NULL DEFAULT 0,
    "leaseTermMonths" INTEGER NOT NULL DEFAULT 12,
    "availableFrom" TIMESTAMP(3),

    CONSTRAINT "ListingRentDetails_pkey" PRIMARY KEY ("listingId")
);

-- CreateTable
CREATE TABLE "ListingSaleDetails" (
    "listingId" TEXT NOT NULL,
    "salePrice" INTEGER NOT NULL,
    "negotiable" BOOLEAN NOT NULL DEFAULT false,
    "titleDocsVerified" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "ListingSaleDetails_pkey" PRIMARY KEY ("listingId")
);

-- CreateTable
CREATE TABLE "ListingShortstayDetails" (
    "listingId" TEXT NOT NULL,
    "nightlyRate" INTEGER NOT NULL,
    "cleaningFee" INTEGER NOT NULL DEFAULT 0,
    "minNights" INTEGER NOT NULL DEFAULT 1,
    "maxNights" INTEGER NOT NULL DEFAULT 30,
    "maxGuests" INTEGER NOT NULL DEFAULT 2,
    "houseRules" TEXT,

    CONSTRAINT "ListingShortstayDetails_pkey" PRIMARY KEY ("listingId")
);

-- CreateIndex
CREATE INDEX "Listing_listingType_status_idx" ON "Listing"("listingType", "status");

-- CreateIndex
CREATE INDEX "Listing_city_idx" ON "Listing"("city");

-- AddForeignKey
ALTER TABLE "Listing" ADD CONSTRAINT "Listing_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ListingPhoto" ADD CONSTRAINT "ListingPhoto_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "Listing"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ListingRentDetails" ADD CONSTRAINT "ListingRentDetails_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "Listing"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ListingSaleDetails" ADD CONSTRAINT "ListingSaleDetails_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "Listing"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ListingShortstayDetails" ADD CONSTRAINT "ListingShortstayDetails_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "Listing"("id") ON DELETE CASCADE ON UPDATE CASCADE;
