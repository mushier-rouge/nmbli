-- CreateEnum
CREATE TYPE "DealerProspectStatus" AS ENUM ('pending', 'contacted', 'declined');

-- CreateTable
CREATE TABLE "DealerProspect" (
    "id" TEXT NOT NULL,
    "briefId" TEXT NOT NULL,
    "dealerId" TEXT,
    "name" TEXT NOT NULL,
    "brand" TEXT NOT NULL,
    "city" TEXT,
    "state" TEXT,
    "zipcode" TEXT,
    "address" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "website" TEXT,
    "source" TEXT,
    "notes" TEXT,
    "driveHours" DOUBLE PRECISION,
    "distanceMiles" DOUBLE PRECISION,
    "status" "DealerProspectStatus" NOT NULL DEFAULT 'pending',
    "lastContactedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DealerProspect_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "DealerProspect" ADD CONSTRAINT "DealerProspect_briefId_fkey" FOREIGN KEY ("briefId") REFERENCES "Brief"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "DealerProspect" ADD CONSTRAINT "DealerProspect_dealerId_fkey" FOREIGN KEY ("dealerId") REFERENCES "Dealer"("id") ON DELETE SET NULL ON UPDATE CASCADE;
