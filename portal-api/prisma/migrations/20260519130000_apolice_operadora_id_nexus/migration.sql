-- operadoraId guarda o identificador da operadora no Nexus (texto), não mais FK para PortalSeguroOperadora.
ALTER TABLE "PortalSeguroApolice" DROP CONSTRAINT IF EXISTS "PortalSeguroApolice_operadoraId_fkey";
