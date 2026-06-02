-- Multi-contratos em Manutencao (contratoId mantém o primeiro para compatibilidade)

ALTER TABLE "Manutencao"
  ADD COLUMN IF NOT EXISTS "contratosIds" JSONB;
