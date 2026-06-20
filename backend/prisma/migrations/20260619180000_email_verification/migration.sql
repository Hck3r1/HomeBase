-- AlterTable
ALTER TABLE "User" ADD COLUMN "emailVerifyToken" TEXT,
ADD COLUMN "emailVerifyTokenExp" TIMESTAMP(3);
