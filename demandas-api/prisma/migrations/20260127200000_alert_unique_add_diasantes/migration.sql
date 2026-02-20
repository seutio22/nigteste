-- Drop old unique constraint
DROP INDEX IF EXISTS "ProjectAlert_projectId_userId_targetType_targetId_responsavelNome_key";

-- Create new unique constraint including diasAntes (permite múltiplos alertas: 1, 3, 7, 15 dias)
CREATE UNIQUE INDEX "ProjectAlert_projectId_userId_targetType_targetId_responsavelNome_diasAntes_key" 
ON "ProjectAlert"("projectId", "userId", "targetType", "targetId", "responsavelNome", "diasAntes");
