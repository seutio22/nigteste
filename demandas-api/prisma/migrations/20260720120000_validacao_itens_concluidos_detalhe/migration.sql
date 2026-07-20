-- Detalhamento de itens concluídos (Contrato / SUB's) na validação
ALTER TABLE "Validacao" ADD COLUMN IF NOT EXISTS "itensConcluidosDetalhe" TEXT;
