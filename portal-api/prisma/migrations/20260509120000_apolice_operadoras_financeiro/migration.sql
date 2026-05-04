-- Catálogo de operadoras, vínculo na apólice, comissionamento, time e faturas mensais.

-- CreateEnum
CREATE TYPE "PortalSeguroConeRegiao" AS ENUM ('NORTE', 'SUL');

-- CreateEnum
CREATE TYPE "PortalApoliceTipoComissao" AS ENUM ('VITALICIO', 'AGENCIAMENTO');

-- CreateEnum
CREATE TYPE "PortalApoliceComissaoInicioPagamento" AS ENUM ('INICIO_VIGENCIA', 'FIM_VIGENCIA', 'MESES_APOS_INICIO_VIGENCIA');

-- CreateTable
CREATE TABLE "PortalSeguroOperadora" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PortalSeguroOperadora_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PortalSeguroApoliceFaturaMes" (
    "id" TEXT NOT NULL,
    "apoliceId" TEXT NOT NULL,
    "competenciaAno" INTEGER NOT NULL,
    "competenciaMes" INTEGER NOT NULL,
    "vidas" INTEGER NOT NULL DEFAULT 0,
    "valorFatura" DECIMAL(14,2) NOT NULL,
    "observacoes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PortalSeguroApoliceFaturaMes_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "PortalSeguroApolice" ADD COLUMN     "operadoraId" TEXT,
ADD COLUMN     "comissaoTipo" "PortalApoliceTipoComissao",
ADD COLUMN     "comissaoValorTotal" DECIMAL(14,2),
ADD COLUMN     "comissaoQuantidadeParcelas" INTEGER,
ADD COLUMN     "comissaoCorretorParceiro" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "comissaoPercentualParceiro" DECIMAL(5,2),
ADD COLUMN     "comissaoInicioPagamento" "PortalApoliceComissaoInicioPagamento",
ADD COLUMN     "comissaoMesesAposInicio" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "trCone" "PortalSeguroConeRegiao",
ADD COLUMN     "trDiretoria" TEXT,
ADD COLUMN     "trSuperintendente" TEXT,
ADD COLUMN     "trGerente" TEXT,
ADD COLUMN     "trExecutivoConsultor" TEXT,
ADD COLUMN     "trAnalista" TEXT;

-- CreateIndex
CREATE INDEX "PortalSeguroOperadora_active_sortOrder_nome_idx" ON "PortalSeguroOperadora"("active", "sortOrder", "nome");

-- CreateIndex
CREATE INDEX "PortalSeguroApolice_operadoraId_idx" ON "PortalSeguroApolice"("operadoraId");

-- AddForeignKey
ALTER TABLE "PortalSeguroApolice" ADD CONSTRAINT "PortalSeguroApolice_operadoraId_fkey" FOREIGN KEY ("operadoraId") REFERENCES "PortalSeguroOperadora"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PortalSeguroApoliceFaturaMes" ADD CONSTRAINT "PortalSeguroApoliceFaturaMes_apoliceId_fkey" FOREIGN KEY ("apoliceId") REFERENCES "PortalSeguroApolice"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateIndex
CREATE INDEX "PortalSeguroApoliceFaturaMes_apoliceId_idx" ON "PortalSeguroApoliceFaturaMes"("apoliceId");

-- CreateIndex
CREATE UNIQUE INDEX "PortalSeguroApoliceFaturaMes_apoliceId_competenciaAno_competenciaMes_key" ON "PortalSeguroApoliceFaturaMes"("apoliceId", "competenciaAno", "competenciaMes");
