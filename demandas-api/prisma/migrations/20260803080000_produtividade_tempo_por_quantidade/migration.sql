-- Remover vínculo indevido a master data de contratos
DROP INDEX IF EXISTS "produtividade_regras_contratoId_idx";
ALTER TABLE "produtividade_regras" DROP COLUMN IF EXISTS "contratoId";

-- Quantidade de contratos (como sistemas) + tempos base/adicional por métrica
ALTER TABLE "produtividade_regras" ADD COLUMN IF NOT EXISTS "qtdContratos" INTEGER;

ALTER TABLE "produtividade_regras" ADD COLUMN IF NOT EXISTS "tempoSistemasSeconds" INTEGER;
ALTER TABLE "produtividade_regras" ADD COLUMN IF NOT EXISTS "tempoSistemasAdicionalSeconds" INTEGER;
ALTER TABLE "produtividade_regras" ADD COLUMN IF NOT EXISTS "tempoUsuariosSeconds" INTEGER;
ALTER TABLE "produtividade_regras" ADD COLUMN IF NOT EXISTS "tempoUsuariosAdicionalSeconds" INTEGER;
ALTER TABLE "produtividade_regras" ADD COLUMN IF NOT EXISTS "tempoClientesSeconds" INTEGER;
ALTER TABLE "produtividade_regras" ADD COLUMN IF NOT EXISTS "tempoClientesAdicionalSeconds" INTEGER;
ALTER TABLE "produtividade_regras" ADD COLUMN IF NOT EXISTS "tempoRetornosSeconds" INTEGER;
ALTER TABLE "produtividade_regras" ADD COLUMN IF NOT EXISTS "tempoRetornosAdicionalSeconds" INTEGER;
ALTER TABLE "produtividade_regras" ADD COLUMN IF NOT EXISTS "tempoItensSeconds" INTEGER;
ALTER TABLE "produtividade_regras" ADD COLUMN IF NOT EXISTS "tempoItensAdicionalSeconds" INTEGER;
ALTER TABLE "produtividade_regras" ADD COLUMN IF NOT EXISTS "tempoContratosSeconds" INTEGER;
ALTER TABLE "produtividade_regras" ADD COLUMN IF NOT EXISTS "tempoContratosAdicionalSeconds" INTEGER;
