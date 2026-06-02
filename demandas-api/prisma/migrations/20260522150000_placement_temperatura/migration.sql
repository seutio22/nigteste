-- CreateTable
CREATE TABLE "PlacementTemperatura" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlacementTemperatura_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "PlacementCotacao" ADD COLUMN "temperaturaId" TEXT;

-- CreateIndex
CREATE INDEX "PlacementTemperatura_nome_idx" ON "PlacementTemperatura"("nome");

-- CreateIndex
CREATE INDEX "PlacementCotacao_temperaturaId_idx" ON "PlacementCotacao"("temperaturaId");

-- AddForeignKey
ALTER TABLE "PlacementCotacao" ADD CONSTRAINT "PlacementCotacao_temperaturaId_fkey" FOREIGN KEY ("temperaturaId") REFERENCES "PlacementTemperatura"("id") ON DELETE SET NULL ON UPDATE CASCADE;
