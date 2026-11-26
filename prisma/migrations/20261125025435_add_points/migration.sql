-- CreateEnum
CREATE TYPE "ActionGroup" AS ENUM ('CLIENT', 'PROFESSIONAL');

-- CreateEnum
CREATE TYPE "WalletType" AS ENUM ('CLIENT_POINTS', 'PROMO_POINTS');

-- CreateEnum
CREATE TYPE "LedgerReason" AS ENUM ('TOPUP', 'SPEND', 'REFUND', 'BONUS', 'ADJUSTMENT');

-- CreateEnum
CREATE TYPE "PaymentCategory" AS ENUM ('POINTS_TOPUP');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('INITIATED', 'SUCCESSFUL', 'FAILED');

-- CreateTable
CREATE TABLE "ActionPrice" (
    "action" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "actionGroup" "ActionGroup" NOT NULL,
    "points" INTEGER NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "updatedById" UUID,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ActionPrice_pkey" PRIMARY KEY ("action")
);

-- CreateTable
CREATE TABLE "CreditPackage" (
    "id" TEXT NOT NULL,
    "points" INTEGER NOT NULL,
    "priceNaira" INTEGER NOT NULL,
    "bonusPoints" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "CreditPackage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Wallet" (
    "id" TEXT NOT NULL,
    "userId" UUID NOT NULL,
    "type" "WalletType" NOT NULL DEFAULT 'CLIENT_POINTS',
    "balance" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Wallet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CreditLedgerEntry" (
    "id" TEXT NOT NULL,
    "walletId" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "balanceAfter" INTEGER NOT NULL,
    "reason" "LedgerReason" NOT NULL,
    "action" TEXT,
    "refType" TEXT,
    "refId" TEXT,
    "paymentId" TEXT,
    "idemKey" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CreditLedgerEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Payment" (
    "id" TEXT NOT NULL,
    "userId" UUID NOT NULL,
    "category" "PaymentCategory" NOT NULL DEFAULT 'POINTS_TOPUP',
    "amountNaira" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'NGN',
    "provider" TEXT NOT NULL DEFAULT 'paystack',
    "reference" TEXT NOT NULL,
    "providerReference" TEXT,
    "status" "PaymentStatus" NOT NULL DEFAULT 'INITIATED',
    "packageId" TEXT,
    "points" INTEGER NOT NULL DEFAULT 0,
    "bonusPoints" INTEGER NOT NULL DEFAULT 0,
    "paidAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MonetizationChangeLog" (
    "id" TEXT NOT NULL,
    "adminId" UUID NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "oldValue" JSONB,
    "newValue" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MonetizationChangeLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Wallet_userId_type_key" ON "Wallet"("userId", "type");

-- CreateIndex
CREATE UNIQUE INDEX "CreditLedgerEntry_idemKey_key" ON "CreditLedgerEntry"("idemKey");

-- CreateIndex
CREATE INDEX "CreditLedgerEntry_walletId_createdAt_idx" ON "CreditLedgerEntry"("walletId", "createdAt");

-- CreateIndex
CREATE INDEX "CreditLedgerEntry_reason_action_createdAt_idx" ON "CreditLedgerEntry"("reason", "action", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Payment_reference_key" ON "Payment"("reference");

-- CreateIndex
CREATE INDEX "Payment_userId_createdAt_idx" ON "Payment"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "MonetizationChangeLog_createdAt_idx" ON "MonetizationChangeLog"("createdAt");

-- AddForeignKey
ALTER TABLE "Wallet" ADD CONSTRAINT "Wallet_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CreditLedgerEntry" ADD CONSTRAINT "CreditLedgerEntry_walletId_fkey" FOREIGN KEY ("walletId") REFERENCES "Wallet"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
