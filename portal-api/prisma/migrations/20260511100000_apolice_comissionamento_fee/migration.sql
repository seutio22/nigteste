-- Comissionamento e fee 1:1 com apólice; remove campos legados de comissão em PortalSeguroApolice.

CREATE TABLE "PortalSeguroApoliceComissionamento" (
    "id" TEXT NOT NULL,
    "apoliceId" TEXT NOT NULL,
    "temCorretorParceiro" BOOLEAN DEFAULT false,
    "valorAgenciamentoContrato" DECIMAL(14,2),
    "valorVitalicioContrato" DECIMAL(14,2),
    "agenciamentoConsultoria" TEXT,
    "vitalicioConsultoria" TEXT,
    "agenciamentoCorretor" TEXT,
    "vitalicioCorretor" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PortalSeguroApoliceComissionamento_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PortalSeguroApoliceComissionamento_apoliceId_key" ON "PortalSeguroApoliceComissionamento"("apoliceId");

CREATE INDEX "PortalSeguroApoliceComissionamento_apoliceId_idx" ON "PortalSeguroApoliceComissionamento"("apoliceId");

CREATE TABLE "PortalSeguroApoliceFee" (
    "id" TEXT NOT NULL,
    "apoliceId" TEXT NOT NULL,
    "valorFeeMensal" DECIMAL(14,2),
    "feeConsultoria" DECIMAL(14,2),
    "feeCorretorParceiro" DECIMAL(14,2),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PortalSeguroApoliceFee_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PortalSeguroApoliceFee_apoliceId_key" ON "PortalSeguroApoliceFee"("apoliceId");

CREATE INDEX "PortalSeguroApoliceFee_apoliceId_idx" ON "PortalSeguroApoliceFee"("apoliceId");

ALTER TABLE "PortalSeguroApoliceComissionamento" ADD CONSTRAINT "PortalSeguroApoliceComissionamento_apoliceId_fkey" FOREIGN KEY ("apoliceId") REFERENCES "PortalSeguroApolice"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "PortalSeguroApoliceFee" ADD CONSTRAINT "PortalSeguroApoliceFee_apoliceId_fkey" FOREIGN KEY ("apoliceId") REFERENCES "PortalSeguroApolice"("id") ON DELETE CASCADE ON UPDATE CASCADE;

INSERT INTO "PortalSeguroApoliceComissionamento" ("id", "apoliceId", "temCorretorParceiro", "valorAgenciamentoContrato", "valorVitalicioContrato", "agenciamentoConsultoria", "vitalicioConsultoria", "agenciamentoCorretor", "vitalicioCorretor", "createdAt", "updatedAt")
SELECT
  gen_random_uuid()::text,
  a."id",
  a."comissaoCorretorParceiro",
  CASE WHEN a."comissaoTipo"::text = 'AGENCIAMENTO' THEN a."comissaoValorTotal" ELSE NULL END,
  CASE WHEN a."comissaoTipo"::text = 'VITALICIO' THEN a."comissaoValorTotal" ELSE NULL END,
  NULL,
  NULL,
  NULL,
  NULL,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM "PortalSeguroApolice" a
WHERE a."comissaoTipo" IS NOT NULL
   OR a."comissaoValorTotal" IS NOT NULL
   OR a."comissaoCorretorParceiro" = true
   OR a."comissaoQuantidadeParcelas" IS NOT NULL
   OR a."comissaoPercentualParceiro" IS NOT NULL
   OR a."comissaoInicioPagamento" IS NOT NULL
   OR COALESCE(a."comissaoMesesAposInicio", 0) <> 0;

ALTER TABLE "PortalSeguroApolice" DROP COLUMN "comissaoTipo",
DROP COLUMN "comissaoValorTotal",
DROP COLUMN "comissaoQuantidadeParcelas",
DROP COLUMN "comissaoCorretorParceiro",
DROP COLUMN "comissaoPercentualParceiro",
DROP COLUMN "comissaoInicioPagamento",
DROP COLUMN "comissaoMesesAposInicio";

DROP TYPE "PortalApoliceTipoComissao";
DROP TYPE "PortalApoliceComissaoInicioPagamento";
