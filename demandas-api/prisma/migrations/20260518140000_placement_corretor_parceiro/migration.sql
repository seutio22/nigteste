-- CreateTable
CREATE TABLE "PlacementCorretorParceiro" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlacementCorretorParceiro_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PlacementCorretorParceiro_nome_idx" ON "PlacementCorretorParceiro"("nome");

-- AlterTable
ALTER TABLE "PlacementCotacao" ADD COLUMN "corretorParceiroId" TEXT;

-- CreateIndex
CREATE INDEX "PlacementCotacao_corretorParceiroId_idx" ON "PlacementCotacao"("corretorParceiroId");

-- AddForeignKey
ALTER TABLE "PlacementCotacao" ADD CONSTRAINT "PlacementCotacao_corretorParceiroId_fkey" FOREIGN KEY ("corretorParceiroId") REFERENCES "PlacementCorretorParceiro"("id") ON DELETE SET NULL ON UPDATE CASCADE;
