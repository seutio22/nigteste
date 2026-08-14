-- AlterTable
ALTER TABLE "produtividade_regras" ADD COLUMN "contratoId" TEXT;

-- CreateIndex
CREATE INDEX "produtividade_regras_contratoId_idx" ON "produtividade_regras"("contratoId");
