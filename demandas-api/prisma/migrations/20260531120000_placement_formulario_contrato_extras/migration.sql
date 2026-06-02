-- Tipo de formulário (Saúde, Odontológico, Vida em grupo, Não seguráveis) e cláusulas contratuais
ALTER TABLE "PlacementCotacao" ADD COLUMN "formularioTipo" TEXT;
ALTER TABLE "PlacementCotacao" ADD COLUMN "multaRescisaoContratual" BOOLEAN;
ALTER TABLE "PlacementCotacao" ADD COLUMN "multaRescisaoValor" TEXT;
ALTER TABLE "PlacementCotacao" ADD COLUMN "multaRescisaoRegra" TEXT;
ALTER TABLE "PlacementCotacao" ADD COLUMN "multaRescisaoAvisoPrevio" TEXT;
ALTER TABLE "PlacementCotacao" ADD COLUMN "possuiConvencaoColetiva" BOOLEAN;
