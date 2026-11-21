-- CreateEnum
CREATE TYPE "CategoryGroup" AS ENUM ('RESIDENTIAL', 'COMMERCIAL', 'LAND');

-- CreateEnum
CREATE TYPE "TransactionType" AS ENUM ('FOR_SALE', 'FOR_RENT', 'SHORT_TERM', 'LEASE');

-- CreateEnum
CREATE TYPE "ListingStatus" AS ENUM ('DRAFT', 'PENDING_REVIEW', 'PUBLISHED', 'REJECTED', 'SUSPENDED', 'RESERVED', 'RENTED', 'SOLD', 'EXPIRED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "Furnishing" AS ENUM ('UNFURNISHED', 'SEMI_FURNISHED', 'FURNISHED');

-- CreateEnum
CREATE TYPE "PricePeriod" AS ENUM ('YEAR', 'MONTH', 'DAY', 'ONE_OFF');

-- CreateEnum
CREATE TYPE "MediaKind" AS ENUM ('IMAGE', 'VIDEO', 'FLOOR_PLAN');

-- CreateTable
CREATE TABLE "PropertyCategory" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "categoryGroup" "CategoryGroup" NOT NULL,
    "hasRooms" BOOLEAN NOT NULL DEFAULT true,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "PropertyCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Amenity" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "Amenity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Property" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "transactionType" "TransactionType" NOT NULL,
    "listingStatus" "ListingStatus" NOT NULL DEFAULT 'DRAFT',
    "postedById" UUID NOT NULL,
    "agencyId" TEXT,
    "state" TEXT NOT NULL,
    "lga" TEXT,
    "city" TEXT NOT NULL,
    "neighbourhood" TEXT,
    "streetAddress" TEXT,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "hideExactAddress" BOOLEAN NOT NULL DEFAULT true,
    "bedrooms" INTEGER,
    "bathrooms" INTEGER,
    "toilets" INTEGER,
    "parkingSpaces" INTEGER,
    "sizeSqm" DOUBLE PRECISION,
    "furnishing" "Furnishing",
    "yearBuilt" INTEGER,
    "priceNaira" BIGINT NOT NULL,
    "pricePeriod" "PricePeriod" NOT NULL,
    "negotiable" BOOLEAN NOT NULL DEFAULT false,
    "additionalCharges" JSONB,
    "publishedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "lastConfirmedAt" TIMESTAMP(3),
    "reviewedById" UUID,
    "reviewedAt" TIMESTAMP(3),
    "rejectionReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Property_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PropertyMedia" (
    "id" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,
    "kind" "MediaKind" NOT NULL DEFAULT 'IMAGE',
    "storageKey" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isCover" BOOLEAN NOT NULL DEFAULT false,
    "mimeType" TEXT,
    "sizeBytes" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PropertyMedia_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_AmenityToProperty" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_AmenityToProperty_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE UNIQUE INDEX "PropertyCategory_slug_key" ON "PropertyCategory"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Amenity_slug_key" ON "Amenity"("slug");

-- CreateIndex
CREATE INDEX "Property_listingStatus_transactionType_state_city_idx" ON "Property"("listingStatus", "transactionType", "state", "city");

-- CreateIndex
CREATE INDEX "Property_postedById_idx" ON "Property"("postedById");

-- CreateIndex
CREATE INDEX "Property_categoryId_idx" ON "Property"("categoryId");

-- CreateIndex
CREATE INDEX "Property_priceNaira_idx" ON "Property"("priceNaira");

-- CreateIndex
CREATE INDEX "PropertyMedia_propertyId_sortOrder_idx" ON "PropertyMedia"("propertyId", "sortOrder");

-- CreateIndex
CREATE INDEX "_AmenityToProperty_B_index" ON "_AmenityToProperty"("B");

-- AddForeignKey
ALTER TABLE "Property" ADD CONSTRAINT "Property_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "PropertyCategory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Property" ADD CONSTRAINT "Property_postedById_fkey" FOREIGN KEY ("postedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Property" ADD CONSTRAINT "Property_agencyId_fkey" FOREIGN KEY ("agencyId") REFERENCES "Agency"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PropertyMedia" ADD CONSTRAINT "PropertyMedia_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_AmenityToProperty" ADD CONSTRAINT "_AmenityToProperty_A_fkey" FOREIGN KEY ("A") REFERENCES "Amenity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_AmenityToProperty" ADD CONSTRAINT "_AmenityToProperty_B_fkey" FOREIGN KEY ("B") REFERENCES "Property"("id") ON DELETE CASCADE ON UPDATE CASCADE;
