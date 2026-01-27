-- Adiciona coluna de controle de expiração de senha
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "passwordUpdatedAt" TIMESTAMP;

-- Preenche valores existentes com a data de atualização do usuário
UPDATE "User"
SET "passwordUpdatedAt" = "updatedAt"
WHERE "passwordUpdatedAt" IS NULL;
