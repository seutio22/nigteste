-- Detalhes do acordo coletivo quando «possuiConvencaoColetiva» = true
ALTER TABLE "PlacementCotacao" ADD COLUMN IF NOT EXISTS "convencaoColetivaDetalhe" TEXT;
