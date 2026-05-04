-- CreateEnum
CREATE TYPE "PortalGrupoEconomicoClassificacao" AS ENUM ('CLIENTE', 'PROSPECT');

-- AlterTable
ALTER TABLE "PortalGrupoEconomico" ADD COLUMN "classificacao" "PortalGrupoEconomicoClassificacao" NOT NULL DEFAULT 'CLIENTE';

CREATE INDEX "PortalGrupoEconomico_classificacao_idx" ON "PortalGrupoEconomico"("classificacao");
