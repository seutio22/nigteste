-- CreateTable
CREATE TABLE IF NOT EXISTS "tempo_adicional" (
    "id" TEXT NOT NULL,
    "pageKey" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "ticket" TEXT,
    "analistaId" TEXT,
    "regraProdutividadeId" TEXT,
    "tempoPrevistoSeconds" INTEGER NOT NULL DEFAULT 0,
    "adicionalSeconds" INTEGER NOT NULL,
    "motivo" TEXT NOT NULL,
    "justificativa" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pendente',
    "comentarioRevisao" TEXT,
    "revisorId" TEXT,
    "revisorNome" TEXT,
    "revisadoEm" TIMESTAMP(3),
    "userId" TEXT,
    "userNome" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tempo_adicional_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "tempo_adicional_pageKey_entityId_idx" ON "tempo_adicional"("pageKey", "entityId");
CREATE INDEX IF NOT EXISTS "tempo_adicional_status_idx" ON "tempo_adicional"("status");
CREATE INDEX IF NOT EXISTS "tempo_adicional_createdAt_idx" ON "tempo_adicional"("createdAt");
