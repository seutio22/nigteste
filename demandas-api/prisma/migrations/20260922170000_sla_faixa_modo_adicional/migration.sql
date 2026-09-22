-- AlterTable
ALTER TABLE "sla_regras" ADD COLUMN IF NOT EXISTS "faixaModo" TEXT NOT NULL DEFAULT 'correspondente';
ALTER TABLE "sla_regras" ADD COLUMN IF NOT EXISTS "faixaAdicionalSeconds" INTEGER;
