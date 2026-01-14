-- Remove unique constraint from Contrato.numero
-- This allows multiple contracts with the same number as long as they have different grupoEconomico
-- The uniqueness validation is now handled at the application level (numero + grupoEconomico)

-- For PostgreSQL
ALTER TABLE "Contrato" DROP CONSTRAINT IF EXISTS "Contrato_numero_key";

-- Note: If using SQLite, the constraint removal might require table recreation
-- For production databases, this migration should be run carefully
