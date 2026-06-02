-- Etapa 3 passa a ser «Contrato Atual»; distribuição por localidade vira etapa 4.
-- Registros que já estavam na antiga etapa 3 (localidade) são movidos para etapa4.
UPDATE "PlacementCotacao"
SET "emCotacaoSubetapa" = 'etapa4'
WHERE "emCotacaoSubetapa" = 'etapa3';
