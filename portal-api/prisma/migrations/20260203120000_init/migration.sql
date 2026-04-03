-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "PortalUserRole" AS ENUM ('COLLABORATOR', 'REQUESTER_MANAGER');

-- CreateEnum
CREATE TYPE "PortalCaseStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'IN_TRIAGE', 'IN_ANALYSIS', 'AWAITING_REQUESTER', 'AWAITING_THIRD_PARTY', 'COMPLETED', 'CANCELLED');

-- CreateTable
CREATE TABLE "PortalUser" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" "PortalUserRole" NOT NULL DEFAULT 'COLLABORATOR',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PortalUser_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PortalArea" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PortalArea_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PortalRequestType" (
    "id" TEXT NOT NULL,
    "areaId" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "formSchema" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PortalRequestType_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PortalCase" (
    "id" TEXT NOT NULL,
    "protocol" TEXT NOT NULL,
    "status" "PortalCaseStatus" NOT NULL DEFAULT 'DRAFT',
    "portalUserId" TEXT NOT NULL,
    "areaId" TEXT,
    "requestTypeId" TEXT,
    "title" TEXT,
    "answers" JSONB,
    "nexusRef" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PortalCase_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PortalUser_email_key" ON "PortalUser"("email");

-- CreateIndex
CREATE UNIQUE INDEX "PortalArea_slug_key" ON "PortalArea"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "PortalRequestType_areaId_slug_key" ON "PortalRequestType"("areaId", "slug");

-- CreateIndex
CREATE UNIQUE INDEX "PortalCase_protocol_key" ON "PortalCase"("protocol");

-- AddForeignKey
ALTER TABLE "PortalRequestType" ADD CONSTRAINT "PortalRequestType_areaId_fkey" FOREIGN KEY ("areaId") REFERENCES "PortalArea"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PortalCase" ADD CONSTRAINT "PortalCase_portalUserId_fkey" FOREIGN KEY ("portalUserId") REFERENCES "PortalUser"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PortalCase" ADD CONSTRAINT "PortalCase_areaId_fkey" FOREIGN KEY ("areaId") REFERENCES "PortalArea"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PortalCase" ADD CONSTRAINT "PortalCase_requestTypeId_fkey" FOREIGN KEY ("requestTypeId") REFERENCES "PortalRequestType"("id") ON DELETE SET NULL ON UPDATE CASCADE;
