-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('buyer', 'dealer', 'ops');

-- CreateEnum
CREATE TYPE "BriefStatus" AS ENUM ('sourcing', 'offers', 'negotiation', 'contract', 'done');

-- CreateEnum
CREATE TYPE "PaymentType" AS ENUM ('cash', 'finance', 'lease');

-- CreateEnum
CREATE TYPE "DealerInviteState" AS ENUM ('sent', 'viewed', 'submitted', 'revised', 'expired');

-- CreateEnum
CREATE TYPE "DealerProspectStatus" AS ENUM ('pending', 'contacted', 'declined');

-- CreateEnum
CREATE TYPE "QuoteStatus" AS ENUM ('draft', 'published', 'superseded', 'accepted', 'rejected');

-- CreateEnum
CREATE TYPE "QuoteLineKind" AS ENUM ('incentive', 'addon', 'fee');

-- CreateEnum
CREATE TYPE "QuoteSource" AS ENUM ('dealer_form', 'email_parsed');

-- CreateEnum
CREATE TYPE "ContractStatus" AS ENUM ('uploaded', 'checked_ok', 'mismatch');

-- CreateEnum
CREATE TYPE "TimelineActor" AS ENUM ('buyer', 'dealer', 'ops', 'system');

-- CreateEnum
CREATE TYPE "TimelineEventType" AS ENUM ('brief_created', 'dealer_invited', 'invite_viewed', 'quote_submitted', 'quote_revised', 'quote_published', 'quote_accepted', 'quote_rejected', 'counter_sent', 'counter_accepted', 'contract_uploaded', 'contract_checked', 'contract_mismatch', 'contract_pass', 'completed', 'automation_started', 'dealer_contacted');

-- CreateEnum
CREATE TYPE "FileOwnerType" AS ENUM ('quote', 'contract', 'timeline');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "role" "UserRole" NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Brief" (
    "id" TEXT NOT NULL,
    "buyerId" TEXT NOT NULL,
    "status" "BriefStatus" NOT NULL DEFAULT 'sourcing',
    "zipcode" TEXT NOT NULL,
    "paymentType" "PaymentType" NOT NULL,
    "maxOTD" DECIMAL(12,2) NOT NULL,
    "makes" TEXT[],
    "models" TEXT[],
    "trims" TEXT[],
    "colors" TEXT[],
    "mustHaves" TEXT[],
    "timelinePreference" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "paymentPreferences" JSONB DEFAULT '[]',

    CONSTRAINT "Brief_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Dealer" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "contactName" TEXT NOT NULL,
    "contactEmail" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "opsOwnerId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Dealer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DealerInvite" (
    "id" TEXT NOT NULL,
    "briefId" TEXT NOT NULL,
    "dealerId" TEXT NOT NULL,
    "magicLinkToken" TEXT NOT NULL,
    "state" "DealerInviteState" NOT NULL DEFAULT 'sent',
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "lastViewedAt" TIMESTAMP(3),
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DealerInvite_pkey" PRIMARY KEY ("id")
);

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

-- CreateTable
CREATE TABLE "Quote" (
    "id" TEXT NOT NULL,
    "briefId" TEXT NOT NULL,
    "dealerId" TEXT NOT NULL,
    "inviteId" TEXT,
    "status" "QuoteStatus" NOT NULL DEFAULT 'draft',
    "vin" TEXT,
    "stockNumber" TEXT,
    "year" INTEGER,
    "make" TEXT,
    "model" TEXT,
    "trim" TEXT,
    "extColor" TEXT,
    "intColor" TEXT,
    "etaDate" TIMESTAMP(3),
    "msrp" DECIMAL(12,2),
    "dealerDiscount" DECIMAL(12,2),
    "docFee" DECIMAL(12,2),
    "dmvFee" DECIMAL(12,2),
    "tireBatteryFee" DECIMAL(12,2),
    "otherFeesTotal" DECIMAL(12,2),
    "incentivesTotal" DECIMAL(12,2),
    "addonsTotal" DECIMAL(12,2),
    "taxRate" DECIMAL(5,4),
    "taxAmount" DECIMAL(12,2),
    "otdTotal" DECIMAL(12,2),
    "paymentType" "PaymentType",
    "aprOrMf" DECIMAL(8,4),
    "termMonths" INTEGER,
    "dasAmount" DECIMAL(12,2),
    "evidenceNote" TEXT,
    "paymentSnapshot" JSONB,
    "confirmations" JSONB,
    "metadata" JSONB,
    "confidence" DECIMAL(4,3),
    "source" "QuoteSource" NOT NULL DEFAULT 'dealer_form',
    "parentQuoteId" TEXT,
    "shadinessScore" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Quote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QuoteLine" (
    "id" TEXT NOT NULL,
    "quoteId" TEXT NOT NULL,
    "kind" "QuoteLineKind" NOT NULL,
    "name" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "approvedByBuyer" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "QuoteLine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Contract" (
    "id" TEXT NOT NULL,
    "quoteId" TEXT NOT NULL,
    "status" "ContractStatus" NOT NULL DEFAULT 'uploaded',
    "checks" JSONB NOT NULL,
    "envelopeId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Contract_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TimelineEvent" (
    "id" TEXT NOT NULL,
    "briefId" TEXT NOT NULL,
    "quoteId" TEXT,
    "type" "TimelineEventType" NOT NULL,
    "actor" "TimelineActor" NOT NULL,
    "payload" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TimelineEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FileAsset" (
    "id" TEXT NOT NULL,
    "ownerType" "FileOwnerType" NOT NULL,
    "ownerId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "originalName" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "checksum" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "quoteId" TEXT,
    "timelineId" TEXT,
    "contractId" TEXT,

    CONSTRAINT "FileAsset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DevInviteCode" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DevInviteCode_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InviteCode" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "usedAt" TIMESTAMP(3),
    "usedByEmail" TEXT,
    "usedByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InviteCode_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Waitlist" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "verificationToken" TEXT,
    "verifiedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notifiedAt" TIMESTAMP(3),

    CONSTRAINT "Waitlist_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Dealership" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "make" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "city" TEXT,
    "address" TEXT,
    "zipcode" TEXT,
    "phone" TEXT,
    "website" TEXT,
    "email" TEXT,
    "discoveredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "lastContactedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Dealership_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DealerContact" (
    "id" TEXT NOT NULL,
    "dealershipId" TEXT NOT NULL,
    "name" TEXT,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "role" TEXT NOT NULL DEFAULT 'sales',
    "firstContactedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastContactedAt" TIMESTAMP(3),
    "totalInteractions" INTEGER NOT NULL DEFAULT 0,
    "preferredContactMethod" TEXT NOT NULL DEFAULT 'email',
    "notes" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DealerContact_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SkyvernRun" (
    "id" TEXT NOT NULL,
    "briefId" TEXT NOT NULL,
    "dealershipId" TEXT,
    "workflowId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "costCents" INTEGER NOT NULL DEFAULT 0,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "result" JSONB,
    "screenshots" JSONB,
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SkyvernRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmailMessage" (
    "id" TEXT NOT NULL,
    "briefId" TEXT NOT NULL,
    "dealershipId" TEXT,
    "contactId" TEXT,
    "direction" TEXT NOT NULL,
    "toEmail" TEXT,
    "fromEmail" TEXT,
    "subject" TEXT,
    "bodyHtml" TEXT,
    "status" TEXT NOT NULL DEFAULT 'sent',
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "gmailMessageId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EmailMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SmsMessage" (
    "id" TEXT NOT NULL,
    "briefId" TEXT NOT NULL,
    "dealershipId" TEXT,
    "contactId" TEXT,
    "direction" TEXT NOT NULL,
    "toNumber" TEXT,
    "fromNumber" TEXT,
    "body" TEXT,
    "status" TEXT NOT NULL DEFAULT 'sent',
    "costCents" INTEGER NOT NULL DEFAULT 0,
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "twilioSid" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SmsMessage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "DealerInvite_magicLinkToken_key" ON "DealerInvite"("magicLinkToken");

-- CreateIndex
CREATE UNIQUE INDEX "Contract_quoteId_key" ON "Contract"("quoteId");

-- CreateIndex
CREATE UNIQUE INDEX "DevInviteCode_code_key" ON "DevInviteCode"("code");

-- CreateIndex
CREATE UNIQUE INDEX "InviteCode_code_key" ON "InviteCode"("code");

-- CreateIndex
CREATE INDEX "InviteCode_code_idx" ON "InviteCode"("code");

-- CreateIndex
CREATE UNIQUE INDEX "Waitlist_email_key" ON "Waitlist"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Waitlist_verificationToken_key" ON "Waitlist"("verificationToken");

-- CreateIndex
CREATE INDEX "Waitlist_email_idx" ON "Waitlist"("email");

-- CreateIndex
CREATE INDEX "Waitlist_createdAt_idx" ON "Waitlist"("createdAt");

-- CreateIndex
CREATE INDEX "Waitlist_verificationToken_idx" ON "Waitlist"("verificationToken");

-- CreateIndex
CREATE INDEX "Dealership_make_state_idx" ON "Dealership"("make", "state");

-- CreateIndex
CREATE INDEX "Dealership_verified_idx" ON "Dealership"("verified");

-- CreateIndex
CREATE UNIQUE INDEX "DealerContact_email_key" ON "DealerContact"("email");

-- CreateIndex
CREATE INDEX "DealerContact_email_idx" ON "DealerContact"("email");

-- CreateIndex
CREATE INDEX "DealerContact_dealershipId_idx" ON "DealerContact"("dealershipId");

-- CreateIndex
CREATE INDEX "SkyvernRun_briefId_idx" ON "SkyvernRun"("briefId");

-- CreateIndex
CREATE INDEX "SkyvernRun_status_idx" ON "SkyvernRun"("status");

-- CreateIndex
CREATE INDEX "EmailMessage_briefId_idx" ON "EmailMessage"("briefId");

-- CreateIndex
CREATE INDEX "SmsMessage_briefId_idx" ON "SmsMessage"("briefId");

-- CreateIndex
CREATE INDEX "SmsMessage_direction_idx" ON "SmsMessage"("direction");

-- AddForeignKey
ALTER TABLE "Brief" ADD CONSTRAINT "Brief_buyerId_fkey" FOREIGN KEY ("buyerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Dealer" ADD CONSTRAINT "Dealer_opsOwnerId_fkey" FOREIGN KEY ("opsOwnerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DealerInvite" ADD CONSTRAINT "DealerInvite_briefId_fkey" FOREIGN KEY ("briefId") REFERENCES "Brief"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DealerInvite" ADD CONSTRAINT "DealerInvite_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DealerInvite" ADD CONSTRAINT "DealerInvite_dealerId_fkey" FOREIGN KEY ("dealerId") REFERENCES "Dealer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DealerProspect" ADD CONSTRAINT "DealerProspect_briefId_fkey" FOREIGN KEY ("briefId") REFERENCES "Brief"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DealerProspect" ADD CONSTRAINT "DealerProspect_dealerId_fkey" FOREIGN KEY ("dealerId") REFERENCES "Dealer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Quote" ADD CONSTRAINT "Quote_briefId_fkey" FOREIGN KEY ("briefId") REFERENCES "Brief"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Quote" ADD CONSTRAINT "Quote_dealerId_fkey" FOREIGN KEY ("dealerId") REFERENCES "Dealer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Quote" ADD CONSTRAINT "Quote_inviteId_fkey" FOREIGN KEY ("inviteId") REFERENCES "DealerInvite"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Quote" ADD CONSTRAINT "Quote_parentQuoteId_fkey" FOREIGN KEY ("parentQuoteId") REFERENCES "Quote"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuoteLine" ADD CONSTRAINT "QuoteLine_quoteId_fkey" FOREIGN KEY ("quoteId") REFERENCES "Quote"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Contract" ADD CONSTRAINT "Contract_quoteId_fkey" FOREIGN KEY ("quoteId") REFERENCES "Quote"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TimelineEvent" ADD CONSTRAINT "TimelineEvent_briefId_fkey" FOREIGN KEY ("briefId") REFERENCES "Brief"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TimelineEvent" ADD CONSTRAINT "TimelineEvent_quoteId_fkey" FOREIGN KEY ("quoteId") REFERENCES "Quote"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FileAsset" ADD CONSTRAINT "FileAsset_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "Contract"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FileAsset" ADD CONSTRAINT "FileAsset_quoteId_fkey" FOREIGN KEY ("quoteId") REFERENCES "Quote"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FileAsset" ADD CONSTRAINT "FileAsset_timelineId_fkey" FOREIGN KEY ("timelineId") REFERENCES "TimelineEvent"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DealerContact" ADD CONSTRAINT "DealerContact_dealershipId_fkey" FOREIGN KEY ("dealershipId") REFERENCES "Dealership"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SkyvernRun" ADD CONSTRAINT "SkyvernRun_briefId_fkey" FOREIGN KEY ("briefId") REFERENCES "Brief"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SkyvernRun" ADD CONSTRAINT "SkyvernRun_dealershipId_fkey" FOREIGN KEY ("dealershipId") REFERENCES "Dealership"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmailMessage" ADD CONSTRAINT "EmailMessage_briefId_fkey" FOREIGN KEY ("briefId") REFERENCES "Brief"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmailMessage" ADD CONSTRAINT "EmailMessage_dealershipId_fkey" FOREIGN KEY ("dealershipId") REFERENCES "Dealership"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmailMessage" ADD CONSTRAINT "EmailMessage_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "DealerContact"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SmsMessage" ADD CONSTRAINT "SmsMessage_briefId_fkey" FOREIGN KEY ("briefId") REFERENCES "Brief"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SmsMessage" ADD CONSTRAINT "SmsMessage_dealershipId_fkey" FOREIGN KEY ("dealershipId") REFERENCES "Dealership"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SmsMessage" ADD CONSTRAINT "SmsMessage_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "DealerContact"("id") ON DELETE SET NULL ON UPDATE CASCADE;
