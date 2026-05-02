-- Rastreio de linhas criadas pela importação Nexus → PostgreSQL do portal.
ALTER TABLE "PortalSeguroEstipulante" ADD COLUMN "importadoNexusEm" TIMESTAMP(3);
ALTER TABLE "PortalSeguroApolice" ADD COLUMN "importadoNexusEm" TIMESTAMP(3);
CREATE INDEX "PortalSeguroApolice_nexusContratoId_idx" ON "PortalSeguroApolice"("nexusContratoId");
