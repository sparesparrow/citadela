-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "Role" AS ENUM ('GUEST', 'ADMIN');

-- CreateEnum
CREATE TYPE "InquiryStatus" AS ENUM ('NEW', 'CONTACTED', 'CONFIRMED', 'DECLINED');

-- CreateEnum
CREATE TYPE "StayStatus" AS ENUM ('BOOKED', 'CHECKED_IN', 'CHECKED_OUT', 'CANCELLED');

-- CreateEnum
CREATE TYPE "CredentialType" AS ENUM ('CARD', 'PHONE');

-- CreateEnum
CREATE TYPE "CredentialStatus" AS ENUM ('ACTIVE', 'REVOKED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "AccessPointKind" AS ENUM ('DOOR', 'SCOOTER_DOCK');

-- CreateEnum
CREATE TYPE "ScooterStatus" AS ENUM ('AVAILABLE', 'RENTED', 'CHARGING', 'MAINTENANCE');

-- CreateEnum
CREATE TYPE "RentalStatus" AS ENUM ('OPEN', 'CLOSED', 'ABANDONED');

-- CreateEnum
CREATE TYPE "FolioItemKind" AS ENUM ('SCOOTER_RENTAL', 'MANUAL');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "name" TEXT,
    "email" TEXT NOT NULL,
    "emailVerified" TIMESTAMP(3),
    "image" TEXT,
    "passwordHash" TEXT,
    "role" "Role" NOT NULL DEFAULT 'GUEST',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Account" (
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    "refresh_token" TEXT,
    "access_token" TEXT,
    "expires_at" INTEGER,
    "token_type" TEXT,
    "scope" TEXT,
    "id_token" TEXT,
    "session_state" TEXT,

    CONSTRAINT "Account_pkey" PRIMARY KEY ("provider","providerAccountId")
);

-- CreateTable
CREATE TABLE "Session" (
    "sessionToken" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL
);

-- CreateTable
CREATE TABLE "VerificationToken" (
    "identifier" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VerificationToken_pkey" PRIMARY KEY ("identifier","token")
);

-- CreateTable
CREATE TABLE "Inquiry" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "arrival" TIMESTAMP(3) NOT NULL,
    "departure" TIMESTAMP(3) NOT NULL,
    "guests" INTEGER NOT NULL DEFAULT 2,
    "roomSlug" TEXT NOT NULL,
    "message" TEXT,
    "locale" TEXT NOT NULL DEFAULT 'cs',
    "status" "InquiryStatus" NOT NULL DEFAULT 'NEW',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" TEXT,

    CONSTRAINT "Inquiry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BlockedDate" (
    "id" TEXT NOT NULL,
    "roomSlug" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'booking.com',
    "uid" TEXT,
    "summary" TEXT,

    CONSTRAINT "BlockedDate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SyncLog" (
    "id" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ok" BOOLEAN NOT NULL DEFAULT false,
    "imported" INTEGER NOT NULL DEFAULT 0,
    "message" TEXT,

    CONSTRAINT "SyncLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Stay" (
    "id" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "arrival" TIMESTAMP(3) NOT NULL,
    "departure" TIMESTAMP(3) NOT NULL,
    "status" "StayStatus" NOT NULL DEFAULT 'BOOKED',
    "guests" INTEGER NOT NULL DEFAULT 2,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "inquiryId" TEXT,
    "userId" TEXT,

    CONSTRAINT "Stay_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StayGuest" (
    "id" TEXT NOT NULL,
    "stayId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "bedroomSlug" TEXT,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StayGuest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Credential" (
    "id" TEXT NOT NULL,
    "publicId" TEXT NOT NULL,
    "type" "CredentialType" NOT NULL,
    "status" "CredentialStatus" NOT NULL DEFAULT 'ACTIVE',
    "secretHash" TEXT NOT NULL,
    "label" TEXT,
    "validFrom" TIMESTAMP(3) NOT NULL,
    "validTo" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revokedAt" TIMESTAMP(3),
    "stayGuestId" TEXT NOT NULL,

    CONSTRAINT "Credential_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AccessPoint" (
    "id" TEXT NOT NULL,
    "kind" "AccessPointKind" NOT NULL,
    "label" TEXT NOT NULL,
    "bedroomSlug" TEXT,
    "isCommon" BOOLEAN NOT NULL DEFAULT false,
    "devicePublicKey" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "lastSeenAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AccessPoint_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UsedNonce" (
    "nonce" TEXT NOT NULL,
    "deviceId" TEXT NOT NULL,
    "seenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UsedNonce_pkey" PRIMARY KEY ("nonce")
);

-- CreateTable
CREATE TABLE "AccessEvent" (
    "id" TEXT NOT NULL,
    "at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "allowed" BOOLEAN NOT NULL,
    "reason" TEXT NOT NULL,
    "accessPointId" TEXT NOT NULL,
    "credentialId" TEXT,

    CONSTRAINT "AccessEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Scooter" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "status" "ScooterStatus" NOT NULL DEFAULT 'AVAILABLE',
    "batteryPct" INTEGER NOT NULL DEFAULT 100,
    "dockId" TEXT,
    "baseFeeCents" INTEGER NOT NULL DEFAULT 0,
    "perMinuteCents" INTEGER NOT NULL DEFAULT 300,

    CONSTRAINT "Scooter_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RentalSession" (
    "id" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endedAt" TIMESTAMP(3),
    "status" "RentalStatus" NOT NULL DEFAULT 'OPEN',
    "termsVersion" TEXT NOT NULL,
    "scooterId" TEXT NOT NULL,
    "stayGuestId" TEXT NOT NULL,

    CONSTRAINT "RentalSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FolioItem" (
    "id" TEXT NOT NULL,
    "stayId" TEXT NOT NULL,
    "kind" "FolioItemKind" NOT NULL,
    "description" TEXT NOT NULL,
    "amountCents" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "rentalSessionId" TEXT,

    CONSTRAINT "FolioItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Session_sessionToken_key" ON "Session"("sessionToken");

-- CreateIndex
CREATE INDEX "Inquiry_status_createdAt_idx" ON "Inquiry"("status", "createdAt");

-- CreateIndex
CREATE INDEX "BlockedDate_roomSlug_date_idx" ON "BlockedDate"("roomSlug", "date");

-- CreateIndex
CREATE UNIQUE INDEX "BlockedDate_roomSlug_date_source_key" ON "BlockedDate"("roomSlug", "date", "source");

-- CreateIndex
CREATE UNIQUE INDEX "Stay_reference_key" ON "Stay"("reference");

-- CreateIndex
CREATE UNIQUE INDEX "Stay_inquiryId_key" ON "Stay"("inquiryId");

-- CreateIndex
CREATE INDEX "Stay_status_arrival_idx" ON "Stay"("status", "arrival");

-- CreateIndex
CREATE INDEX "StayGuest_stayId_idx" ON "StayGuest"("stayId");

-- CreateIndex
CREATE UNIQUE INDEX "Credential_publicId_key" ON "Credential"("publicId");

-- CreateIndex
CREATE INDEX "Credential_stayGuestId_idx" ON "Credential"("stayGuestId");

-- CreateIndex
CREATE INDEX "Credential_status_validTo_idx" ON "Credential"("status", "validTo");

-- CreateIndex
CREATE INDEX "AccessPoint_kind_enabled_idx" ON "AccessPoint"("kind", "enabled");

-- CreateIndex
CREATE INDEX "UsedNonce_expiresAt_idx" ON "UsedNonce"("expiresAt");

-- CreateIndex
CREATE INDEX "AccessEvent_at_idx" ON "AccessEvent"("at");

-- CreateIndex
CREATE INDEX "AccessEvent_accessPointId_at_idx" ON "AccessEvent"("accessPointId", "at");

-- CreateIndex
CREATE UNIQUE INDEX "Scooter_code_key" ON "Scooter"("code");

-- CreateIndex
CREATE INDEX "Scooter_status_idx" ON "Scooter"("status");

-- CreateIndex
CREATE INDEX "RentalSession_status_idx" ON "RentalSession"("status");

-- CreateIndex
CREATE INDEX "RentalSession_stayGuestId_status_idx" ON "RentalSession"("stayGuestId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "FolioItem_rentalSessionId_key" ON "FolioItem"("rentalSessionId");

-- CreateIndex
CREATE INDEX "FolioItem_stayId_idx" ON "FolioItem"("stayId");

-- AddForeignKey
ALTER TABLE "Account" ADD CONSTRAINT "Account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Inquiry" ADD CONSTRAINT "Inquiry_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Stay" ADD CONSTRAINT "Stay_inquiryId_fkey" FOREIGN KEY ("inquiryId") REFERENCES "Inquiry"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Stay" ADD CONSTRAINT "Stay_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StayGuest" ADD CONSTRAINT "StayGuest_stayId_fkey" FOREIGN KEY ("stayId") REFERENCES "Stay"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Credential" ADD CONSTRAINT "Credential_stayGuestId_fkey" FOREIGN KEY ("stayGuestId") REFERENCES "StayGuest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AccessEvent" ADD CONSTRAINT "AccessEvent_accessPointId_fkey" FOREIGN KEY ("accessPointId") REFERENCES "AccessPoint"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AccessEvent" ADD CONSTRAINT "AccessEvent_credentialId_fkey" FOREIGN KEY ("credentialId") REFERENCES "Credential"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Scooter" ADD CONSTRAINT "Scooter_dockId_fkey" FOREIGN KEY ("dockId") REFERENCES "AccessPoint"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RentalSession" ADD CONSTRAINT "RentalSession_scooterId_fkey" FOREIGN KEY ("scooterId") REFERENCES "Scooter"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RentalSession" ADD CONSTRAINT "RentalSession_stayGuestId_fkey" FOREIGN KEY ("stayGuestId") REFERENCES "StayGuest"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FolioItem" ADD CONSTRAINT "FolioItem_stayId_fkey" FOREIGN KEY ("stayId") REFERENCES "Stay"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FolioItem" ADD CONSTRAINT "FolioItem_rentalSessionId_fkey" FOREIGN KEY ("rentalSessionId") REFERENCES "RentalSession"("id") ON DELETE SET NULL ON UPDATE CASCADE;

