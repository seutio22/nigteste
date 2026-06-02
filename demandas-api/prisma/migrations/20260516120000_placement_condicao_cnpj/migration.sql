-- AlterTable
ALTER TABLE "PlacementCondicao" ADD COLUMN "cnpj" TEXT;

CREATE UNIQUE INDEX "PlacementCondicao_cnpj_key" ON "PlacementCondicao"("cnpj");
