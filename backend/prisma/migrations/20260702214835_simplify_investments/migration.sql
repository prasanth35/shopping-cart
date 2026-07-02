/*
  Warnings:

  - You are about to drop the column `category` on the `Investment` table. All the data in the column will be lost.
  - You are about to drop the column `currentNav` on the `Investment` table. All the data in the column will be lost.
  - You are about to drop the column `folioNumber` on the `Investment` table. All the data in the column will be lost.
  - You are about to drop the column `fundName` on the `Investment` table. All the data in the column will be lost.
  - You are about to drop the column `navUpdatedAt` on the `Investment` table. All the data in the column will be lost.
  - You are about to drop the `InvestmentTransaction` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `name` to the `Investment` table without a default value. This is not possible if the table is not empty.
  - Added the required column `type` to the `Investment` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "InvestmentType" AS ENUM ('SIP', 'MUTUAL_FUND', 'NPS', 'FD', 'RD', 'OTHER');

-- AlterEnum
ALTER TYPE "TransactionType" ADD VALUE 'INVESTMENT_CONTRIBUTION';

-- DropForeignKey
ALTER TABLE "InvestmentTransaction" DROP CONSTRAINT "InvestmentTransaction_investmentId_fkey";

-- AlterTable
ALTER TABLE "Investment" DROP COLUMN "category",
DROP COLUMN "currentNav",
DROP COLUMN "folioNumber",
DROP COLUMN "fundName",
DROP COLUMN "navUpdatedAt",
ADD COLUMN     "currentValue" DECIMAL(14,2) NOT NULL DEFAULT 0,
ADD COLUMN     "name" TEXT NOT NULL,
ADD COLUMN     "referenceNumber" TEXT,
ADD COLUMN     "type" "InvestmentType" NOT NULL,
ADD COLUMN     "valueUpdatedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Transaction" ADD COLUMN     "investmentId" TEXT;

-- DropTable
DROP TABLE "InvestmentTransaction";

-- DropEnum
DROP TYPE "InvestmentTxnType";

-- CreateIndex
CREATE INDEX "Transaction_investmentId_idx" ON "Transaction"("investmentId");

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_investmentId_fkey" FOREIGN KEY ("investmentId") REFERENCES "Investment"("id") ON DELETE SET NULL ON UPDATE CASCADE;
