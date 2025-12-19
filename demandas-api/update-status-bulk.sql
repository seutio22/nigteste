-- ============================================
-- SCRIPT DE ALTERAÇÃO EM MASSA DE STATUS
-- ============================================
-- 
-- INSTRUÇÕES:
-- 1. Substitua os valores entre < > pelos seus valores reais
-- 2. Descomente a query da tabela que você quer atualizar
-- 3. Execute no seu banco de dados PostgreSQL
--
-- IMPORTANTE: Faça backup antes de executar!
-- ============================================

-- ============================================
-- OPÇÃO 1: Atualizar DEMANDAS
-- ============================================
-- Exemplo: Alterar status "Pendente" para "Em Andamento"
/*
UPDATE "Demanda"
SET 
  status = '<NOVO_STATUS>',
  "updatedAt" = NOW()
WHERE 
  status = '<STATUS_ATUAL>';
*/

-- Exemplo com múltiplos status antigos:
/*
UPDATE "Demanda"
SET 
  status = '<NOVO_STATUS>',
  "updatedAt" = NOW()
WHERE 
  status IN ('<STATUS_1>', '<STATUS_2>', '<STATUS_3>');
*/

-- Exemplo com critérios adicionais (por data):
/*
UPDATE "Demanda"
SET 
  status = '<NOVO_STATUS>',
  "updatedAt" = NOW()
WHERE 
  status = '<STATUS_ATUAL>'
  AND "createdAt" < '2024-01-01';
*/

-- Exemplo com critérios por cliente:
/*
UPDATE "Demanda"
SET 
  status = '<NOVO_STATUS>',
  "updatedAt" = NOW()
WHERE 
  status = '<STATUS_ATUAL>'
  AND "clienteId" = '<ID_DO_CLIENTE>';
*/

-- ============================================
-- OPÇÃO 2: Atualizar MANUTENÇÕES
-- ============================================
/*
UPDATE "Manutencao"
SET 
  status = '<NOVO_STATUS>',
  "updatedAt" = NOW()
WHERE 
  status = '<STATUS_ATUAL>';
*/

-- ============================================
-- OPÇÃO 3: Atualizar ATENDIMENTOS
-- ============================================
/*
UPDATE "Atendimento"
SET 
  status = '<NOVO_STATUS>',
  "updatedAt" = NOW()
WHERE 
  status = '<STATUS_ATUAL>';
*/

-- ============================================
-- OPÇÃO 4: Atualizar PROJECTS
-- ============================================
/*
UPDATE "Project"
SET 
  status = '<NOVO_STATUS>',
  "updatedAt" = NOW()
WHERE 
  status = '<STATUS_ATUAL>';
*/

-- ============================================
-- OPÇÃO 5: Atualizar PROJECT TASKS
-- ============================================
/*
UPDATE "ProjectTask"
SET 
  status = '<NOVO_STATUS>',
  "updatedAt" = NOW()
WHERE 
  status = '<STATUS_ATUAL>';
*/

-- ============================================
-- OPÇÃO 6: Atualizar VALIDAÇÕES
-- ============================================
/*
UPDATE "Validacao"
SET 
  status = '<NOVO_STATUS>',
  "updatedAt" = NOW()
WHERE 
  status = '<STATUS_ATUAL>';
*/

-- ============================================
-- OPÇÃO 7: Atualizar VALIDAÇÕES MANUTENÇÃO
-- ============================================
/*
UPDATE "ValidacaoManutencao"
SET 
  status = '<NOVO_STATUS>',
  "updatedAt" = NOW()
WHERE 
  status = '<STATUS_ATUAL>';
*/

-- ============================================
-- VERIFICAÇÃO ANTES DE EXECUTAR
-- ============================================
-- Use estas queries para ver quantos registros serão afetados:

-- Para DEMANDAS:
/*
SELECT 
  status,
  COUNT(*) as quantidade
FROM "Demanda"
GROUP BY status
ORDER BY quantidade DESC;
*/

-- Para MANUTENÇÕES:
/*
SELECT 
  status,
  COUNT(*) as quantidade
FROM "Manutencao"
GROUP BY status
ORDER BY quantidade DESC;
*/

-- Para ATENDIMENTOS:
/*
SELECT 
  status,
  COUNT(*) as quantidade
FROM "Atendimento"
GROUP BY status
ORDER BY quantidade DESC;
*/

-- ============================================
-- EXEMPLO COMPLETO: Atualizar Demandas
-- ============================================
-- Descomente e ajuste conforme necessário:

/*
-- 1. Primeiro, veja quantos registros serão afetados:
SELECT COUNT(*) as total
FROM "Demanda"
WHERE status = 'Pendente';

-- 2. Execute a atualização:
UPDATE "Demanda"
SET 
  status = 'Em Andamento',
  "updatedAt" = NOW()
WHERE 
  status = 'Pendente';

-- 3. Verifique o resultado:
SELECT 
  status,
  COUNT(*) as quantidade
FROM "Demanda"
GROUP BY status
ORDER BY quantidade DESC;
*/

