-- CreateTable
CREATE TABLE "PropertyAlert" (
    "id" TEXT NOT NULL,
    "userId" UUID NOT NULL,
    "label" TEXT NOT NULL,
    "purpose" TEXT,
    "categoryGroup" "CategoryGroup",
    "categorySlug" TEXT,
    "q" TEXT,
    "minPrice" BIGINT,
    "maxPrice" BIGINT,
    "minBedrooms" INTEGER,
    "amenitySlugs" TEXT[],
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PropertyAlert_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PropertyAlert_userId_idx" ON "PropertyAlert"("userId");

-- CreateIndex
CREATE INDEX "PropertyAlert_active_purpose_idx" ON "PropertyAlert"("active", "purpose");

-- AddForeignKey
ALTER TABLE "PropertyAlert" ADD CONSTRAINT "PropertyAlert_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
