-- CreateTable
CREATE TABLE "PlacementProjeto" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlacementProjeto_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlacementPedido" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlacementPedido_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "PlacementCotacao" ADD COLUMN     "projetoId" TEXT,
ADD COLUMN     "pedidoId" TEXT,
ADD COLUMN     "solicitante" TEXT;

-- CreateIndex
CREATE INDEX "PlacementProjeto_nome_idx" ON "PlacementProjeto"("nome");

-- CreateIndex
CREATE INDEX "PlacementPedido_nome_idx" ON "PlacementPedido"("nome");

-- CreateIndex
CREATE INDEX "PlacementCotacao_projetoId_idx" ON "PlacementCotacao"("projetoId");

-- CreateIndex
CREATE INDEX "PlacementCotacao_pedidoId_idx" ON "PlacementCotacao"("pedidoId");

-- AddForeignKey
ALTER TABLE "PlacementCotacao" ADD CONSTRAINT "PlacementCotacao_projetoId_fkey" FOREIGN KEY ("projetoId") REFERENCES "PlacementProjeto"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlacementCotacao" ADD CONSTRAINT "PlacementCotacao_pedidoId_fkey" FOREIGN KEY ("pedidoId") REFERENCES "PlacementPedido"("id") ON DELETE SET NULL ON UPDATE CASCADE;
