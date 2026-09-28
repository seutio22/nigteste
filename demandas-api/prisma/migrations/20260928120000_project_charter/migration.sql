-- Project Charter (escopo, itens incluídos/excluídos e riscos mapeados)
ALTER TABLE "Project" ADD COLUMN IF NOT EXISTS "charter" TEXT DEFAULT '{}';
