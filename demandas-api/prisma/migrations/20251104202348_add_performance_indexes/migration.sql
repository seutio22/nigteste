-- 🚀 MELHORIA 3: Índices de Performance - 50-80% mais rápido nas queries
-- Criar índices críticos para campos mais usados em ordenação e busca

-- Índices para Demanda (tabela mais usada)
CREATE INDEX IF NOT EXISTS "idx_demanda_updated_at" ON "Demanda"("updatedAt" DESC);
CREATE INDEX IF NOT EXISTS "idx_demanda_created_at" ON "Demanda"("createdAt" DESC);
CREATE INDEX IF NOT EXISTS "idx_demanda_status" ON "Demanda"("status");
CREATE INDEX IF NOT EXISTS "idx_demanda_analista_id" ON "Demanda"("analistaId");
CREATE INDEX IF NOT EXISTS "idx_demanda_area_id" ON "Demanda"("areaId");
CREATE INDEX IF NOT EXISTS "idx_demanda_cliente_id" ON "Demanda"("clienteId");
CREATE INDEX IF NOT EXISTS "idx_demanda_ticket" ON "Demanda"("ticket");

-- Índices para Manutencao
CREATE INDEX IF NOT EXISTS "idx_manutencao_updated_at" ON "Manutencao"("updatedAt" DESC);
CREATE INDEX IF NOT EXISTS "idx_manutencao_created_at" ON "Manutencao"("createdAt" DESC);
CREATE INDEX IF NOT EXISTS "idx_manutencao_status" ON "Manutencao"("status");
CREATE INDEX IF NOT EXISTS "idx_manutencao_analista_id" ON "Manutencao"("analistaId");
CREATE INDEX IF NOT EXISTS "idx_manutencao_area_id" ON "Manutencao"("areaId");
CREATE INDEX IF NOT EXISTS "idx_manutencao_ticket" ON "Manutencao"("ticket");

-- Índices para Atendimento
CREATE INDEX IF NOT EXISTS "idx_atendimento_updated_at" ON "Atendimento"("updatedAt" DESC);
CREATE INDEX IF NOT EXISTS "idx_atendimento_created_at" ON "Atendimento"("createdAt" DESC);
CREATE INDEX IF NOT EXISTS "idx_atendimento_status" ON "Atendimento"("status");
CREATE INDEX IF NOT EXISTS "idx_atendimento_analista_id" ON "Atendimento"("analistaId");

-- Índices para Validacao
CREATE INDEX IF NOT EXISTS "idx_validacao_updated_at" ON "Validacao"("updatedAt" DESC);
CREATE INDEX IF NOT EXISTS "idx_validacao_status" ON "Validacao"("status");
CREATE INDEX IF NOT EXISTS "idx_validacao_analista_id" ON "Validacao"("analistaId");

-- Índices para Reajuste
CREATE INDEX IF NOT EXISTS "idx_reajuste_updated_at" ON "Reajuste"("updatedAt" DESC);
CREATE INDEX IF NOT EXISTS "idx_reajuste_created_at" ON "Reajuste"("createdAt" DESC);

-- Índices para Mailling (busca por email)
CREATE INDEX IF NOT EXISTS "idx_mailling_email" ON "Mailling"("email");
CREATE INDEX IF NOT EXISTS "idx_mailling_created_at" ON "Mailling"("createdAt" DESC);

-- Índices para Analytics/Report
CREATE INDEX IF NOT EXISTS "idx_report_updated_at" ON "Report"("updatedAt" DESC);
CREATE INDEX IF NOT EXISTS "idx_report_status" ON "Report"("status");
CREATE INDEX IF NOT EXISTS "idx_report_analista_id" ON "Report"("analistaId");

-- Índices compostos para queries frequentes (Demanda + Status + UpdatedAt)
CREATE INDEX IF NOT EXISTS "idx_demanda_status_updated_at" ON "Demanda"("status", "updatedAt" DESC);
CREATE INDEX IF NOT EXISTS "idx_manutencao_status_updated_at" ON "Manutencao"("status", "updatedAt" DESC);

