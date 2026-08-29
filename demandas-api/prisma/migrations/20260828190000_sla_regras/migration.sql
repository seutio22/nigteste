-- CreateTable
CREATE TABLE "sla_regras" (
    "id" TEXT NOT NULL,
    "pageKey" TEXT NOT NULL,
    "tipo1Id" TEXT,
    "tipo2Id" TEXT,
    "impacto" TEXT NOT NULL,
    "qtdSistemas" INTEGER,
    "tempoSistemasSeconds" INTEGER,
    "tempoSistemasAdicionalSeconds" INTEGER,
    "tempoSistemasAdicionalPorTotalSeconds" INTEGER,
    "sistemasDetalhe" JSONB,
    "qtdUsuarios" INTEGER,
    "tempoUsuariosSeconds" INTEGER,
    "tempoUsuariosAdicionalSeconds" INTEGER,
    "qtdClientes" INTEGER,
    "tempoClientesSeconds" INTEGER,
    "tempoClientesAdicionalSeconds" INTEGER,
    "qtdRetornos" INTEGER,
    "tempoRetornosSeconds" INTEGER,
    "tempoRetornosAdicionalSeconds" INTEGER,
    "qtdItens" INTEGER,
    "tempoItensSeconds" INTEGER,
    "tempoItensAdicionalSeconds" INTEGER,
    "qtdContratos" INTEGER,
    "tempoContratosSeconds" INTEGER,
    "tempoContratosAdicionalSeconds" INTEGER,
    "qtdSubs" INTEGER,
    "tempoSubsSeconds" INTEGER,
    "tempoSubsAdicionalSeconds" INTEGER,
    "tempoPrevistoSeconds" INTEGER,
    "pesoPontos" DOUBLE PRECISION,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sla_regras_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "sla_regras_pageKey_idx" ON "sla_regras"("pageKey");

-- CreateIndex
CREATE INDEX "sla_regras_pageKey_ativo_idx" ON "sla_regras"("pageKey", "ativo");

-- CreateIndex
CREATE INDEX "sla_regras_pageKey_impacto_idx" ON "sla_regras"("pageKey", "impacto");
