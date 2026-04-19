-- Estipulante: vários CNPJs por grupo econômico (nome Nexus) + vínculo opcional ao grupo local
-- Apólice: referência opcional ao contrato Nexus

ALTER TABLE "PortalSeguroEstipulante" ADD COLUMN "grupoEconomicoNome" TEXT NOT NULL DEFAULT '';
UPDATE "PortalSeguroEstipulante" AS e
SET "grupoEconomicoNome" = TRIM(g."nome")
FROM "PortalGrupoEconomico" AS g
WHERE e."grupoEconomicoId" = g."id";

ALTER TABLE "PortalSeguroEstipulante" ADD COLUMN "nexusClienteId" TEXT;

ALTER TABLE "PortalSeguroApolice" ADD COLUMN "nexusContratoId" TEXT;

ALTER TABLE "PortalSeguroEstipulante" ALTER COLUMN "grupoEconomicoId" DROP NOT NULL;

DROP INDEX IF EXISTS "PortalSeguroEstipulante_grupoEconomicoId_cnpj_key";

CREATE UNIQUE INDEX "PortalSeguroEstipulante_grupoEconomicoNome_cnpj_key" ON "PortalSeguroEstipulante" ("grupoEconomicoNome", "cnpj");

CREATE INDEX "PortalSeguroEstipulante_grupoEconomicoNome_idx" ON "PortalSeguroEstipulante"("grupoEconomicoNome");

ALTER TABLE "PortalSeguroEstipulante" ALTER COLUMN "grupoEconomicoNome" DROP DEFAULT;
