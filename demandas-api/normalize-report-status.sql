-- Corrige status antigos na tabela Report (Analytics) para o padrão do Cadastro.
-- Padrão: Pendente | Em andamento | Transf. Analista | Concluída | Entregue | Cancelada
--
-- Execute no PostgreSQL (Railway Query, pgAdmin, psql) conectado ao banco da aplicação.

-- Concluído (todas as variações) → Concluída
UPDATE "Report"
SET status = 'Concluída', "updatedAt" = NOW()
WHERE status IN (
  'concluído', 'concluída', 'concluida', 'concluido',
  'Concluído', 'Concluída', 'Concluida', 'Concluido',
  'CONCLUÍDO', 'CONCLUÍDA', 'CONCLUIDO', 'CONCLUIDA'
);

-- Pendente
UPDATE "Report"
SET status = 'Pendente', "updatedAt" = NOW()
WHERE status IN ('pendente', 'PENDENTE', 'Pendente', 'aberta');

-- Em andamento
UPDATE "Report"
SET status = 'Em andamento', "updatedAt" = NOW()
WHERE status IN (
  'em andamento', 'em_andamento', 'EM ANDAMENTO',
  'Em Andamento', 'emandamento', 'Em andamento'
);

-- Transf. Analista
UPDATE "Report"
SET status = 'Transf. Analista', "updatedAt" = NOW()
WHERE status IN (
  'transf. analista', 'transf_analista', 'Transf. Analista',
  'transfanalista', 'TRANSF. ANALISTA'
);

-- Entregue
UPDATE "Report"
SET status = 'Entregue', "updatedAt" = NOW()
WHERE status IN ('entregue', 'ENTREGUE', 'Entregue');

-- Cancelada
UPDATE "Report"
SET status = 'Cancelada', "updatedAt" = NOW()
WHERE status IN ('cancelado', 'cancelada', 'CANCELADO', 'Cancelado', 'Cancelada');

-- Conferir resultado (opcional)
-- SELECT status, COUNT(*) FROM "Report" GROUP BY status ORDER BY status;
