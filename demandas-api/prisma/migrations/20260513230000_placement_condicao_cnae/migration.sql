-- CreateTable: Condições (grupo econômico + razão social + CNAE)
CREATE TABLE "PlacementCondicao" (
    "id" TEXT NOT NULL,
    "grupoEconomico" TEXT,
    "razaoSocial" TEXT NOT NULL,
    "cnae" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlacementCondicao_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "PlacementCondicao_grupoEconomico_idx" ON "PlacementCondicao"("grupoEconomico");
CREATE INDEX "PlacementCondicao_razaoSocial_idx" ON "PlacementCondicao"("razaoSocial");
CREATE INDEX "PlacementCondicao_cnae_idx" ON "PlacementCondicao"("cnae");

-- AlterTable: CNAE no prospect
ALTER TABLE "PlacementProspect" ADD COLUMN "cnae" TEXT NOT NULL DEFAULT '';

CREATE INDEX "PlacementProspect_cnae_idx" ON "PlacementProspect"("cnae");

-- AlterTable: vínculo da cotação com condição (cliente da casa)
ALTER TABLE "PlacementCotacao" ADD COLUMN "condicaoId" TEXT;

CREATE INDEX "PlacementCotacao_condicaoId_idx" ON "PlacementCotacao"("condicaoId");

ALTER TABLE "PlacementCotacao" ADD CONSTRAINT "PlacementCotacao_condicaoId_fkey" FOREIGN KEY ("condicaoId") REFERENCES "PlacementCondicao"("id") ON DELETE SET NULL ON UPDATE CASCADE;
