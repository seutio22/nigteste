-- ============================================
-- CORREÇÃO DE STATUS: "EM ANDAMENT" -> "Em Andamento"
-- Apenas 1 caso na tabela Demanda
-- ============================================

-- PASSO 1: VERIFICAR ANTES DE ALTERAR
-- Execute esta query primeiro para ver o que será alterado:
SELECT 
  id,
  status,
  ticket,
  descricao,
  "createdAt",
  "updatedAt"
FROM "Demanda"
WHERE status = 'EM ANDAMENT';

-- PASSO 2: EXECUTAR A CORREÇÃO
-- Só execute o UPDATE abaixo após verificar o resultado do SELECT acima
-- e confirmar que é realmente o registro que você quer alterar

UPDATE "Demanda"
SET 
  status = 'Em Andamento',
  "updatedAt" = NOW()
WHERE 
  status = 'EM ANDAMENT';

-- PASSO 3: VERIFICAR O RESULTADO
-- Execute esta query para confirmar que a alteração foi feita:
SELECT 
  id,
  status,
  ticket,
  "updatedAt"
FROM "Demanda"
WHERE status = 'Em Andamento'
ORDER BY "updatedAt" DESC
LIMIT 5;

