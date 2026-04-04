-- CreateTable
CREATE TABLE "PortalSlaProfile" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "slaTriagemMinutos" INTEGER NOT NULL,
    "slaAtuacaoMinutos" INTEGER NOT NULL,
    "minutosAdicionalAposRetornoDemanda" INTEGER NOT NULL DEFAULT 0,
    "pausarQuandoAguardandoDemanda" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PortalSlaProfile_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PortalSlaProfile_slug_key" ON "PortalSlaProfile"("slug");

-- AlterTable
ALTER TABLE "PortalRequestType" ADD COLUMN "slaProfileId" TEXT;

-- AddForeignKey
ALTER TABLE "PortalRequestType" ADD CONSTRAINT "PortalRequestType_slaProfileId_fkey" FOREIGN KEY ("slaProfileId") REFERENCES "PortalSlaProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;
