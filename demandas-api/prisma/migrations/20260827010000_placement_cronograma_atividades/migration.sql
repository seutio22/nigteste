-- Template de atividades do cronograma (Dados → Placement → Cronograma)
CREATE TABLE IF NOT EXISTS "placement_cronograma_atividades" (
    "id" TEXT NOT NULL,
    "ordem" INTEGER NOT NULL DEFAULT 0,
    "etapaKey" TEXT NOT NULL,
    "tarefa" TEXT NOT NULL,
    "subtarefa" TEXT,
    "parentId" TEXT,
    "slaDias" INTEGER,
    "slaReferencia" TEXT NOT NULL DEFAULT 'apos_anterior',
    "responsavelPadrao" TEXT,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "observacoes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "placement_cronograma_atividades_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "placement_cronograma_atividades_ordem_idx"
  ON "placement_cronograma_atividades"("ordem");

CREATE INDEX IF NOT EXISTS "placement_cronograma_atividades_etapaKey_idx"
  ON "placement_cronograma_atividades"("etapaKey");

CREATE INDEX IF NOT EXISTS "placement_cronograma_atividades_parentId_idx"
  ON "placement_cronograma_atividades"("parentId");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'placement_cronograma_atividades_parentId_fkey'
  ) THEN
    ALTER TABLE "placement_cronograma_atividades"
      ADD CONSTRAINT "placement_cronograma_atividades_parentId_fkey"
      FOREIGN KEY ("parentId") REFERENCES "placement_cronograma_atividades"("id")
      ON DELETE RESTRICT ON UPDATE RESTRICT;
  END IF;
END $$;
