-- Script SQL para normalizar status de Manutenção
-- Todas as variações de "CONCLUIDO" serão normalizadas para "Concluída"
-- Execute este script diretamente no banco de dados PostgreSQL

-- Primeiro, vamos ver quantos registros serão afetados
SELECT 
    status,
    COUNT(*) as quantidade
FROM "Manutencao"
WHERE status IN (
    'CONCLUIDO',
    'Concluido',
    'concluido',
    'CONCLUIDA',
    'Concluida',
    'concluida',
    'CONCLUÍDO',
    'Concluído',
    'concluído',
    'CONCLUÍDA',
    'concluída'
)
GROUP BY status
ORDER BY status;

-- Atualizar todas as variações para "Concluída"
UPDATE "Manutencao"
SET 
    status = 'Concluída',
    "updatedAt" = NOW()
WHERE status IN (
    'CONCLUIDO',
    'Concluido',
    'concluido',
    'CONCLUIDA',
    'Concluida',
    'concluida',
    'CONCLUÍDO',
    'Concluído',
    'concluído',
    'CONCLUÍDA',
    'concluída'
);

-- Verificar resultado final
SELECT 
    status,
    COUNT(*) as quantidade
FROM "Manutencao"
WHERE status LIKE '%conclu%' OR status LIKE '%CONCLU%'
GROUP BY status
ORDER BY status;

