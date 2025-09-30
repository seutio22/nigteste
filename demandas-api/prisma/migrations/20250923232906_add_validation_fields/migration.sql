-- AlterTable
ALTER TABLE "Validacao" ADD COLUMN "estruturaEdge" TEXT;
ALTER TABLE "Validacao" ADD COLUMN "estruturaMove" TEXT;
ALTER TABLE "Validacao" ADD COLUMN "formalizacao" TEXT;
ALTER TABLE "Validacao" ADD COLUMN "itensConcluidos" INTEGER;
ALTER TABLE "Validacao" ADD COLUMN "itensPendentes" INTEGER;

-- AlterTable
ALTER TABLE "ValidacaoManutencao" ADD COLUMN "estruturaEdge" TEXT;
ALTER TABLE "ValidacaoManutencao" ADD COLUMN "estruturaMove" TEXT;
ALTER TABLE "ValidacaoManutencao" ADD COLUMN "formalizacao" TEXT;
ALTER TABLE "ValidacaoManutencao" ADD COLUMN "itensConcluidos" INTEGER;
ALTER TABLE "ValidacaoManutencao" ADD COLUMN "itensPendentes" INTEGER;
