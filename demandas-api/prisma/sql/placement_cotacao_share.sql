CREATE TABLE IF NOT EXISTS "PlacementCotacaoShareToken" (
  "id" TEXT PRIMARY KEY,
  "cotacaoId" TEXT NOT NULL,
  "token" TEXT NOT NULL UNIQUE,
  "name" TEXT,
  "description" TEXT,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "allowedViews" TEXT NOT NULL DEFAULT 'grupo_elegivel,localidades,mercado_quadro,contrato_atual,comparativo_propostas,comparativo_diferenciais',
  "expiresAt" TIMESTAMP(3),
  "viewCount" INTEGER NOT NULL DEFAULT 0,
  "lastViewAt" TIMESTAMP(3),
  "createdBy" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "PlacementCotacaoShareToken_cotacaoId_isActive_idx"
  ON "PlacementCotacaoShareToken"("cotacaoId", "isActive");

CREATE TABLE IF NOT EXISTS "PlacementCotacaoShareAccessLog" (
  "id" TEXT PRIMARY KEY,
  "shareTokenId" TEXT NOT NULL,
  "ipAddress" TEXT NOT NULL,
  "userAgent" TEXT,
  "accessedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "PlacementCotacaoShareAccessLog_shareTokenId_accessedAt_idx"
  ON "PlacementCotacaoShareAccessLog"("shareTokenId", "accessedAt");

DO $$ BEGIN
  ALTER TABLE "PlacementCotacaoShareToken"
    ADD CONSTRAINT "PlacementCotacaoShareToken_cotacaoId_fkey"
    FOREIGN KEY ("cotacaoId") REFERENCES "PlacementCotacao"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "PlacementCotacaoShareAccessLog"
    ADD CONSTRAINT "PlacementCotacaoShareAccessLog_shareTokenId_fkey"
    FOREIGN KEY ("shareTokenId") REFERENCES "PlacementCotacaoShareToken"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
