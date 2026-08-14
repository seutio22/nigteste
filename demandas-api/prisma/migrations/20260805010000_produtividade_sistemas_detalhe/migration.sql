-- Tempo por sistema (específico / padrão) + adicional por Total
ALTER TABLE "produtividade_regras" ADD COLUMN IF NOT EXISTS "tempoSistemasAdicionalPorTotalSeconds" INTEGER;
ALTER TABLE "produtividade_regras" ADD COLUMN IF NOT EXISTS "sistemasDetalhe" JSONB;
