-- AlterTable
ALTER TABLE "User" ADD COLUMN "resetOtpHash" TEXT,
ADD COLUMN "resetOtpExp" TIMESTAMP(3);
