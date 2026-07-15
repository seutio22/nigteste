-- CreateTable
CREATE TABLE "diferenciais" (
    "id" TEXT NOT NULL,
    "operadoraId" TEXT NOT NULL,
    "placementPlanoId" TEXT NOT NULL,
    "itemKey" TEXT NOT NULL,
    "texto" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "diferenciais_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "diferenciais_operadoraId_idx" ON "diferenciais"("operadoraId");

-- CreateIndex
CREATE INDEX "diferenciais_placementPlanoId_idx" ON "diferenciais"("placementPlanoId");

-- CreateIndex
CREATE UNIQUE INDEX "diferenciais_operadoraId_placementPlanoId_itemKey_key" ON "diferenciais"("operadoraId", "placementPlanoId", "itemKey");

-- AddForeignKey
ALTER TABLE "diferenciais" ADD CONSTRAINT "diferenciais_operadoraId_fkey" FOREIGN KEY ("operadoraId") REFERENCES "Operadora"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "diferenciais" ADD CONSTRAINT "diferenciais_placementPlanoId_fkey" FOREIGN KEY ("placementPlanoId") REFERENCES "PlacementPlano"("id") ON DELETE CASCADE ON UPDATE CASCADE;
