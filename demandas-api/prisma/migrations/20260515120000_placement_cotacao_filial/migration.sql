-- AlterTable
ALTER TABLE "PlacementCotacao" ADD COLUMN "filialId" TEXT;

-- CreateIndex
CREATE INDEX "PlacementCotacao_filialId_idx" ON "PlacementCotacao"("filialId");

-- AddForeignKey
ALTER TABLE "PlacementCotacao" ADD CONSTRAINT "PlacementCotacao_filialId_fkey" FOREIGN KEY ("filialId") REFERENCES "PlacementFilial"("id") ON DELETE SET NULL ON UPDATE CASCADE;
