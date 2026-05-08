-- Add ativo flag to Padrao (non-destructive)

ALTER TABLE "Padrao"
  ADD COLUMN IF NOT EXISTS "ativo" BOOLEAN NOT NULL DEFAULT true;

