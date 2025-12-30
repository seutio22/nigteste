-- Script SQL para alterar status "ESPERA DE TERCEIROS" para "Em andamento"
-- Execute este script diretamente no banco de dados PostgreSQL

-- Verificar quantos registros serão afetados
SELECT 
    status,
    COUNT(*) as quantidade
FROM "Manutencao"
WHERE status = 'ESPERA DE TERCEIROS';

-- Atualizar status
UPDATE "Manutencao"
SET 
    status = 'Em andamento',
    "updatedAt" = NOW()
WHERE status = 'ESPERA DE TERCEIROS';

-- Verificar resultado
SELECT 
    status,
    COUNT(*) as quantidade
FROM "Manutencao"
WHERE status IN ('ESPERA DE TERCEIROS', 'Em andamento')
GROUP BY status
ORDER BY status;

