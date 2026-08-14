-- CreateTable
CREATE TABLE "condicoes_contratuais" (
    "id" TEXT NOT NULL,
    "operadoraId" TEXT NOT NULL,
    "porPlano" BOOLEAN NOT NULL DEFAULT false,
    "placementPlanoId" TEXT,
    "itemKey" TEXT NOT NULL,
    "texto" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "condicoes_contratuais_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "condicoes_contratuais_operadoraId_idx" ON "condicoes_contratuais"("operadoraId");

-- CreateIndex
CREATE INDEX "condicoes_contratuais_placementPlanoId_idx" ON "condicoes_contratuais"("placementPlanoId");

-- CreateIndex
CREATE INDEX "condicoes_contratuais_operadoraId_itemKey_idx" ON "condicoes_contratuais"("operadoraId", "itemKey");

-- Unique: um registro por fornecedor+item quando NÃO é por plano
CREATE UNIQUE INDEX "condicoes_contratuais_fornecedor_item_uidx"
  ON "condicoes_contratuais"("operadoraId", "itemKey")
  WHERE "porPlano" = false;

-- Unique: um registro por fornecedor+plano+item quando É por plano
CREATE UNIQUE INDEX "condicoes_contratuais_fornecedor_plano_item_uidx"
  ON "condicoes_contratuais"("operadoraId", "placementPlanoId", "itemKey")
  WHERE "porPlano" = true AND "placementPlanoId" IS NOT NULL;

-- AddForeignKey
ALTER TABLE "condicoes_contratuais" ADD CONSTRAINT "condicoes_contratuais_operadoraId_fkey" FOREIGN KEY ("operadoraId") REFERENCES "Operadora"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "condicoes_contratuais" ADD CONSTRAINT "condicoes_contratuais_placementPlanoId_fkey" FOREIGN KEY ("placementPlanoId") REFERENCES "PlacementPlano"("id") ON DELETE CASCADE ON UPDATE CASCADE;
