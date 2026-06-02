-- Subfatura: empresas participantes por cotação Placement

CREATE TABLE "PlacementSubfatura" (
    "id" TEXT NOT NULL,
    "cotacaoId" TEXT NOT NULL,
    "cnpj" TEXT NOT NULL,
    "razaoSocial" TEXT NOT NULL,
    "cidade" TEXT,
    "uf" TEXT,
    "vidas" INTEGER,
    "anexos" JSONB NOT NULL DEFAULT '[]',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlacementSubfatura_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PlacementSubfatura_cotacaoId_cnpj_key" ON "PlacementSubfatura"("cotacaoId", "cnpj");

CREATE INDEX "PlacementSubfatura_cotacaoId_idx" ON "PlacementSubfatura"("cotacaoId");

ALTER TABLE "PlacementSubfatura" ADD CONSTRAINT "PlacementSubfatura_cotacaoId_fkey" FOREIGN KEY ("cotacaoId") REFERENCES "PlacementCotacao"("id") ON DELETE CASCADE ON UPDATE CASCADE;
