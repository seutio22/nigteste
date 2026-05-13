-- CreateTable
CREATE TABLE "PlacementCotacao" (
    "id" TEXT NOT NULL,
    "ticket" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'Aberta',
    "analistaId" TEXT,
    "userId" TEXT,
    "clienteId" TEXT,
    "ramo" TEXT,
    "operadorasIds" JSONB,
    "vidas" INTEGER,
    "valorEstimadoCents" INTEGER,
    "dataInicio" TIMESTAMP(3),
    "dataLimite" TIMESTAMP(3),
    "descricao" TEXT,
    "observacoes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlacementCotacao_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PlacementCotacao_ticket_key" ON "PlacementCotacao"("ticket");

-- CreateIndex
CREATE INDEX "PlacementCotacao_status_updatedAt_idx" ON "PlacementCotacao"("status", "updatedAt");

-- CreateIndex
CREATE INDEX "PlacementCotacao_analistaId_idx" ON "PlacementCotacao"("analistaId");

-- CreateIndex
CREATE INDEX "PlacementCotacao_clienteId_idx" ON "PlacementCotacao"("clienteId");

-- AddForeignKey
ALTER TABLE "PlacementCotacao" ADD CONSTRAINT "PlacementCotacao_analistaId_fkey" FOREIGN KEY ("analistaId") REFERENCES "Analista"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlacementCotacao" ADD CONSTRAINT "PlacementCotacao_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "Cliente"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlacementCotacao" ADD CONSTRAINT "PlacementCotacao_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
