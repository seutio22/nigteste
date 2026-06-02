-- CreateTable
CREATE TABLE "PlacementPlano" (
    "id" TEXT NOT NULL,
    "operadoraId" TEXT NOT NULL,
    "categoria" TEXT NOT NULL,
    "plano" TEXT NOT NULL,
    "reembolso" TEXT,
    "eventosReembolsaveis" TEXT,
    "acomodacao" TEXT,
    "abrangencia" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlacementPlano_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PlacementPlano_operadoraId_idx" ON "PlacementPlano"("operadoraId");

-- CreateIndex
CREATE INDEX "PlacementPlano_categoria_idx" ON "PlacementPlano"("categoria");

-- CreateIndex
CREATE INDEX "PlacementPlano_plano_idx" ON "PlacementPlano"("plano");
