-- Verifica coluna e contagem de preenchidos
SELECT
  COUNT(*) AS total,
  SUM(CASE WHEN "passwordUpdatedAt" IS NOT NULL THEN 1 ELSE 0 END) AS preenchidos
FROM "User";

-- Amostra dos últimos usuários
SELECT
  id,
  email,
  "passwordUpdatedAt",
  "updatedAt"
FROM "User"
ORDER BY "updatedAt" DESC
LIMIT 5;
