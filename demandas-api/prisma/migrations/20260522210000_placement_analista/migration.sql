CREATE TABLE IF NOT EXISTS "PlacementAnalista" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "coordenadorAnalista" TEXT NOT NULL,
    "gerenteAnalista" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlacementAnalista_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "PlacementAnalista_nome_idx" ON "PlacementAnalista"("nome");

ALTER TABLE "PlacementCotacao" ADD COLUMN IF NOT EXISTS "analistaResponsavelId" TEXT;

CREATE INDEX IF NOT EXISTS "PlacementCotacao_analistaResponsavelId_idx" ON "PlacementCotacao"("analistaResponsavelId");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'PlacementCotacao_analistaResponsavelId_fkey'
  ) THEN
    ALTER TABLE "PlacementCotacao" ADD CONSTRAINT "PlacementCotacao_analistaResponsavelId_fkey"
      FOREIGN KEY ("analistaResponsavelId") REFERENCES "PlacementAnalista"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
