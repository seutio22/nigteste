-- Etapa «Kick off» — estratégia alinhada antes de «Em cotação».
ALTER TABLE "PlacementCotacao" ADD COLUMN IF NOT EXISTS "kickOffEstrategia" JSONB;
