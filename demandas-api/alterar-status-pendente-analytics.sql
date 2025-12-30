-- Script SQL para alterar status "pendente" para "PENDENTE" na tabela Report (Analytics)
-- Execute este script diretamente no banco de dados PostgreSQL

-- Verificar quantos registros serão afetados
SELECT 
    status,
    COUNT(*) as quantidade
FROM "Report"
WHERE status = 'pendente';

-- Atualizar status
UPDATE "Report"
SET 
    status = 'PENDENTE',
    "updatedAt" = NOW()
WHERE status = 'pendente';

-- Verificar resultado
SELECT 
    status,
    COUNT(*) as quantidade
FROM "Report"
WHERE status IN ('pendente', 'PENDENTE')
GROUP BY status
ORDER BY status;

