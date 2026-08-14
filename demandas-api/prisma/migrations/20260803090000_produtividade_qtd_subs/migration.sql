-- Quantidade de SUB's (validações: Contrato + SUB's)
ALTER TABLE "produtividade_regras" ADD COLUMN IF NOT EXISTS "qtdSubs" INTEGER;
ALTER TABLE "produtividade_regras" ADD COLUMN IF NOT EXISTS "tempoSubsSeconds" INTEGER;
ALTER TABLE "produtividade_regras" ADD COLUMN IF NOT EXISTS "tempoSubsAdicionalSeconds" INTEGER;
