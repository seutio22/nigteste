-- Enums e linhas de plano estruturadas por apólice (custo médio ou por faixa etária).

CREATE TYPE "PortalApoliceModeloDadosSeguro" AS ENUM ('PLANO', 'COBERTURA');

CREATE TYPE "PortalApoliceTipoCustoPlano" AS ENUM ('CUSTO_MEDIO', 'FAIXA_ETARIA');

ALTER TABLE "PortalSeguroApolice" ADD COLUMN "modeloDadosSeguro" "PortalApoliceModeloDadosSeguro";

CREATE TABLE "PortalSeguroApolicePlanoLinha" (
    "id" TEXT NOT NULL,
    "apoliceId" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "codigoPlano" TEXT NOT NULL,
    "tipoCusto" "PortalApoliceTipoCustoPlano" NOT NULL,
    "custoMedio" DECIMAL(14,4),
    "valoresPorFaixa" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PortalSeguroApolicePlanoLinha_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "PortalSeguroApolicePlanoLinha_apoliceId_sortOrder_idx" ON "PortalSeguroApolicePlanoLinha"("apoliceId", "sortOrder");

ALTER TABLE "PortalSeguroApolicePlanoLinha" ADD CONSTRAINT "PortalSeguroApolicePlanoLinha_apoliceId_fkey" FOREIGN KEY ("apoliceId") REFERENCES "PortalSeguroApolice"("id") ON DELETE CASCADE ON UPDATE CASCADE;
