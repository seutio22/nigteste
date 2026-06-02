-- Mapeamento produto × fornecedor atual e planos/coberturas (Placement)
ALTER TABLE "PlacementCotacao" ADD COLUMN "itensMapeamento" JSONB;
ALTER TABLE "PlacementCotacao" ADD COLUMN "planosCobertura" JSONB;
