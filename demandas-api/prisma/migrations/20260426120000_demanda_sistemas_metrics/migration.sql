-- Add JSONB metrics per system for Demanda.
-- This enables storing { [sistemaId]: { qtdUsuarios?: number, qtdClientesVinculados?: number } }
-- without breaking legacy single-field history.

ALTER TABLE "Demanda"
ADD COLUMN IF NOT EXISTS "sistemasMetrics" JSONB;

