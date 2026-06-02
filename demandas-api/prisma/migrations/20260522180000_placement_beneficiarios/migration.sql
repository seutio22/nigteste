-- Subetapa «Em cotação» + base de beneficiários para cotação
ALTER TABLE "PlacementCotacao" ADD COLUMN IF NOT EXISTS "emCotacaoSubetapa" TEXT DEFAULT 'beneficiarios';

CREATE TABLE IF NOT EXISTS "PlacementCotacaoBeneficiario" (
    "id" TEXT NOT NULL,
    "cotacaoId" TEXT NOT NULL,
    "ordem" INTEGER,
    "empresa" TEXT,
    "sub" TEXT,
    "cnpj" TEXT,
    "matricula" TEXT,
    "sexo" TEXT,
    "nome" TEXT,
    "dataNascimento" TIMESTAMP(3),
    "grauParentesco" TEXT,
    "statusBeneficiario" TEXT,
    "cid10" TEXT,
    "motivoAfastamento" TEXT,
    "dataInicioBeneficio" TIMESTAMP(3),
    "dataFinalBeneficio" TIMESTAMP(3),
    "cargo" TEXT,
    "cidade" TEXT,
    "uf" TEXT,
    "operadora" TEXT,
    "planoAtual" TEXT,
    "acomodacao" TEXT,
    "custoPerCapita" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlacementCotacaoBeneficiario_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "PlacementCotacaoBeneficiario_cotacaoId_idx" ON "PlacementCotacaoBeneficiario"("cotacaoId");
CREATE INDEX IF NOT EXISTS "PlacementCotacaoBeneficiario_cotacaoId_matricula_idx" ON "PlacementCotacaoBeneficiario"("cotacaoId", "matricula");

DO $$ BEGIN
 ALTER TABLE "PlacementCotacaoBeneficiario" ADD CONSTRAINT "PlacementCotacaoBeneficiario_cotacaoId_fkey" FOREIGN KEY ("cotacaoId") REFERENCES "PlacementCotacao"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
