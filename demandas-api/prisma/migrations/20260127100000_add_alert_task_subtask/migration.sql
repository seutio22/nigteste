-- AlterTable: add targetType and targetId to ProjectAlert
ALTER TABLE "ProjectAlert" ADD COLUMN IF NOT EXISTS "targetType" TEXT NOT NULL DEFAULT '';
ALTER TABLE "ProjectAlert" ADD COLUMN IF NOT EXISTS "targetId" TEXT NOT NULL DEFAULT '';

-- Drop old unique constraint if exists
DROP INDEX IF EXISTS "ProjectAlert_projectId_userId_responsavelNome_key";

-- Create new unique constraint
CREATE UNIQUE INDEX "ProjectAlert_projectId_userId_targetType_targetId_responsavelNome_key" 
ON "ProjectAlert"("projectId", "userId", "targetType", "targetId", "responsavelNome");
