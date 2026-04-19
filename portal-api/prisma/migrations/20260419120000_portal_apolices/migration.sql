-- CreateEnum
CREATE TYPE "PortalApoliceProduto" AS ENUM ('SAUDE', 'ODONTO', 'VIDA_GRUPO', 'OUTROS');

-- CreateTable
CREATE TABLE "PortalApolice" (
    "id" TEXT NOT NULL,
    "portalUserId" TEXT NOT NULL,
    "grupoEconomico" TEXT NOT NULL,
    "numeroApolice" TEXT NOT NULL,
    "produto" "PortalApoliceProduto" NOT NULL,
    "fornecedor" TEXT NOT NULL,
    "subestipulante" TEXT NOT NULL,
    "plano" TEXT,
    "coberturas" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PortalApolice_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PortalApolice_portalUserId_idx" ON "PortalApolice"("portalUserId");

-- CreateIndex
CREATE INDEX "PortalApolice_numeroApolice_idx" ON "PortalApolice"("numeroApolice");

-- AddForeignKey
ALTER TABLE "PortalApolice" ADD CONSTRAINT "PortalApolice_portalUserId_fkey" FOREIGN KEY ("portalUserId") REFERENCES "PortalUser"("id") ON DELETE CASCADE ON UPDATE CASCADE;
