-- CreateTable
CREATE TABLE "indicadores_operadoras" (
    "id" TEXT NOT NULL,
    "operadoraId" TEXT NOT NULL,
    "itemKey" TEXT NOT NULL,
    "texto" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "indicadores_operadoras_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "indicadores_operadoras_operadoraId_idx" ON "indicadores_operadoras"("operadoraId");

-- CreateIndex
CREATE INDEX "indicadores_operadoras_operadoraId_itemKey_idx" ON "indicadores_operadoras"("operadoraId", "itemKey");

-- CreateIndex
CREATE UNIQUE INDEX "indicadores_operadoras_operadoraId_itemKey_key" ON "indicadores_operadoras"("operadoraId", "itemKey");

-- AddForeignKey
ALTER TABLE "indicadores_operadoras" ADD CONSTRAINT "indicadores_operadoras_operadoraId_fkey" FOREIGN KEY ("operadoraId") REFERENCES "Operadora"("id") ON DELETE CASCADE ON UPDATE CASCADE;
