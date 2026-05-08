-- Add multi-systems support to Manutencao (non-destructive)

ALTER TABLE "Manutencao"
  ADD COLUMN IF NOT EXISTS "sistemasIds" JSONB;

ALTER TABLE "Manutencao"
  ADD COLUMN IF NOT EXISTS "sistemasTotais" JSONB;

