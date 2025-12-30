-- Script SQL para alterar status "em_andamento" para "EM ANDAMENTO" na tabela Report (Analytics)
-- Execute este script diretamente no banco de dados PostgreSQL

-- Verificar quantos registros serão afetados
SELECT 
    status,
    COUNT(*) as quantidade
FROM "Report"
WHERE status = 'em_andamento';

-- Atualizar status
UPDATE "Report"
SET 
    status = 'EM ANDAMENTO',
    "updatedAt" = NOW()
WHERE status = 'em_andamento';

-- Verificar resultado
SELECT 
    status,
    COUNT(*) as quantidade
FROM "Report"
WHERE status IN ('em_andamento', 'EM ANDAMENTO')
GROUP BY status
ORDER BY status;

