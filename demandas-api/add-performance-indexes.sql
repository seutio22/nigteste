-- Índices para reduzir CPU em filtros comuns (sem alterar funcionalidades)
DO $$
BEGIN
  IF to_regclass('"DeletionLog"') IS NOT NULL THEN
    CREATE INDEX IF NOT EXISTS "DeletionLog_deletedAt_idx" ON "DeletionLog" ("deletedAt");
    CREATE INDEX IF NOT EXISTS "DeletionLog_entityType_idx" ON "DeletionLog" ("entityType");
    CREATE INDEX IF NOT EXISTS "DeletionLog_deletedBy_idx" ON "DeletionLog" ("deletedBy");
  END IF;

  IF to_regclass('"UserActivity"') IS NOT NULL THEN
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'UserActivity' AND column_name = 'userId'
    ) THEN
      CREATE INDEX IF NOT EXISTS "UserActivity_userId_createdAt_idx" ON "UserActivity" ("userId", "createdAt");
    END IF;
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'UserActivity' AND column_name = 'action'
    ) THEN
      CREATE INDEX IF NOT EXISTS "UserActivity_action_createdAt_idx" ON "UserActivity" ("action", "createdAt");
    END IF;
  END IF;

  IF to_regclass('"UserSession"') IS NOT NULL THEN
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'UserSession' AND column_name = 'isActive'
    ) THEN
      CREATE INDEX IF NOT EXISTS "UserSession_isActive_lastActivity_idx" ON "UserSession" ("isActive", "lastActivity");
    END IF;
  END IF;

  IF to_regclass('"Demanda"') IS NOT NULL THEN
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'Demanda' AND column_name = 'status'
    ) THEN
      CREATE INDEX IF NOT EXISTS "Demanda_status_createdAt_idx" ON "Demanda" ("status", "createdAt");
    END IF;
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'Demanda' AND column_name = 'analistaId'
    ) THEN
      CREATE INDEX IF NOT EXISTS "Demanda_analistaId_idx" ON "Demanda" ("analistaId");
    END IF;
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'Demanda' AND column_name = 'areaId'
    ) THEN
      CREATE INDEX IF NOT EXISTS "Demanda_areaId_idx" ON "Demanda" ("areaId");
    END IF;
  END IF;

  IF to_regclass('"Atendimento"') IS NOT NULL THEN
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'Atendimento' AND column_name = 'status'
    ) THEN
      CREATE INDEX IF NOT EXISTS "Atendimento_status_createdAt_idx" ON "Atendimento" ("status", "createdAt");
    END IF;
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'Atendimento' AND column_name = 'analistaId'
    ) THEN
      CREATE INDEX IF NOT EXISTS "Atendimento_analistaId_idx" ON "Atendimento" ("analistaId");
    END IF;
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'Atendimento' AND column_name = 'areaId'
    ) THEN
      CREATE INDEX IF NOT EXISTS "Atendimento_areaId_idx" ON "Atendimento" ("areaId");
    END IF;
  END IF;

  IF to_regclass('"Validacao"') IS NOT NULL THEN
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'Validacao' AND column_name = 'status'
    ) THEN
      CREATE INDEX IF NOT EXISTS "Validacao_status_createdAt_idx" ON "Validacao" ("status", "createdAt");
    END IF;
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'Validacao' AND column_name = 'analistaId'
    ) THEN
      CREATE INDEX IF NOT EXISTS "Validacao_analistaId_idx" ON "Validacao" ("analistaId");
    END IF;
  END IF;

  IF to_regclass('"Report"') IS NOT NULL THEN
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'Report' AND column_name = 'status'
    ) THEN
      CREATE INDEX IF NOT EXISTS "Report_status_createdAt_idx" ON "Report" ("status", "createdAt");
    END IF;
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'Report' AND column_name = 'userId'
    ) THEN
      CREATE INDEX IF NOT EXISTS "Report_userId_idx" ON "Report" ("userId");
    END IF;
  END IF;
END $$;
