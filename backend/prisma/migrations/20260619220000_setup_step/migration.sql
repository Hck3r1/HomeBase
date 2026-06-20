-- CreateEnum
CREATE TYPE "SetupStep" AS ENUM ('profile', 'role', 'preferences', 'kyc');

-- AlterTable
ALTER TABLE "User" ADD COLUMN "setupStep" "SetupStep" NOT NULL DEFAULT 'profile';

-- Resume partial setup for users who already saved progress
UPDATE "User"
SET "setupStep" = 'kyc'
WHERE "setupCompletedAt" IS NULL
  AND "role" = 'lister'
  AND "id" IN (
    SELECT "userId" FROM "UserPreference" WHERE cardinality("listingTypes") > 0
  );

UPDATE "User"
SET "setupStep" = 'preferences'
WHERE "setupCompletedAt" IS NULL
  AND "setupStep" = 'profile'
  AND "id" IN (
    SELECT "userId" FROM "UserPreference" WHERE cardinality("listingTypes") > 0
  );

UPDATE "User"
SET "setupStep" = 'role'
WHERE "setupCompletedAt" IS NULL
  AND "setupStep" = 'profile'
  AND "gender" IS NOT NULL;
