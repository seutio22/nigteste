ALTER TABLE "PlacementCotacaoShareAccessLog"
  ADD COLUMN IF NOT EXISTS "clickEvents" JSONB;
