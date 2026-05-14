-- CreateTable
CREATE TABLE "PlacementProspect" (
    "id" TEXT NOT NULL,
    "razaoSocial" TEXT NOT NULL,
    "grupoEconomico" TEXT,
    "cnpj" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlacementProspect_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PlacementProspect_cnpj_key" ON "PlacementProspect"("cnpj");

-- CreateIndex
CREATE INDEX "PlacementProspect_razaoSocial_idx" ON "PlacementProspect"("razaoSocial");

-- CreateIndex
CREATE INDEX "PlacementProspect_grupoEconomico_idx" ON "PlacementProspect"("grupoEconomico");

-- AlterTable
ALTER TABLE "PlacementCotacao" ADD COLUMN "prospectId" TEXT;

-- CreateIndex
CREATE INDEX "PlacementCotacao_prospectId_idx" ON "PlacementCotacao"("prospectId");

-- AddForeignKey
ALTER TABLE "PlacementCotacao" ADD CONSTRAINT "PlacementCotacao_prospectId_fkey" FOREIGN KEY ("prospectId") REFERENCES "PlacementProspect"("id") ON DELETE SET NULL ON UPDATE CASCADE;
