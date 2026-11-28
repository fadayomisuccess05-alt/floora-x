-- CreateEnum
CREATE TYPE "InspectionStatus" AS ENUM ('PENDING', 'RESCHEDULED', 'ACCEPTED', 'REJECTED', 'CANCELLED', 'COMPLETED', 'MISSED');

-- CreateTable
CREATE TABLE "Inspection" (
    "id" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,
    "clientId" UUID NOT NULL,
    "repId" UUID NOT NULL,
    "scheduledAt" TIMESTAMP(3) NOT NULL,
    "proposedById" UUID NOT NULL,
    "status" "InspectionStatus" NOT NULL DEFAULT 'PENDING',
    "note" TEXT,
    "responseNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Inspection_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Inspection_clientId_status_idx" ON "Inspection"("clientId", "status");

-- CreateIndex
CREATE INDEX "Inspection_repId_status_idx" ON "Inspection"("repId", "status");

-- CreateIndex
CREATE INDEX "Inspection_propertyId_clientId_idx" ON "Inspection"("propertyId", "clientId");

-- AddForeignKey
ALTER TABLE "Inspection" ADD CONSTRAINT "Inspection_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Inspection" ADD CONSTRAINT "Inspection_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Inspection" ADD CONSTRAINT "Inspection_repId_fkey" FOREIGN KEY ("repId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
