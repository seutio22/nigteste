-- Substitui cadastro plano de apólice por base hierárquica (grupo → estipulante → apólice → itens)

DROP TABLE IF EXISTS "PortalApolice";

CREATE TABLE "PortalGrupoEconomico" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "cnpj" TEXT,
    "observacoes" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PortalGrupoEconomico_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "PortalGrupoEconomico_nome_idx" ON "PortalGrupoEconomico"("nome");

CREATE TABLE "PortalSeguroEstipulante" (
    "id" TEXT NOT NULL,
    "grupoEconomicoId" TEXT NOT NULL,
    "razaoSocial" TEXT NOT NULL,
    "cnpj" TEXT NOT NULL,
    "nomeFantasia" TEXT,
    "observacoes" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PortalSeguroEstipulante_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "PortalSeguroEstipulante_grupoEconomicoId_idx" ON "PortalSeguroEstipulante"("grupoEconomicoId");

CREATE UNIQUE INDEX "PortalSeguroEstipulante_grupoEconomicoId_cnpj_key" ON "PortalSeguroEstipulante"("grupoEconomicoId", "cnpj");

ALTER TABLE "PortalSeguroEstipulante" ADD CONSTRAINT "PortalSeguroEstipulante_grupoEconomicoId_fkey" FOREIGN KEY ("grupoEconomicoId") REFERENCES "PortalGrupoEconomico"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "PortalSeguroApolice" (
    "id" TEXT NOT NULL,
    "estipulanteId" TEXT NOT NULL,
    "numeroApolice" TEXT NOT NULL,
    "produto" "PortalApoliceProduto" NOT NULL,
    "fornecedor" TEXT NOT NULL,
    "subestipulante" TEXT NOT NULL,
    "plano" TEXT,
    "coberturas" TEXT,
    "vigenciaInicio" TIMESTAMP(3),
    "vigenciaFim" TIMESTAMP(3),
    "observacoes" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PortalSeguroApolice_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "PortalSeguroApolice_estipulanteId_idx" ON "PortalSeguroApolice"("estipulanteId");

CREATE UNIQUE INDEX "PortalSeguroApolice_estipulanteId_numeroApolice_key" ON "PortalSeguroApolice"("estipulanteId", "numeroApolice");

ALTER TABLE "PortalSeguroApolice" ADD CONSTRAINT "PortalSeguroApolice_estipulanteId_fkey" FOREIGN KEY ("estipulanteId") REFERENCES "PortalSeguroEstipulante"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TYPE "PortalSeguroItemTipo" AS ENUM ('COBERTURA', 'SERVICO', 'CLAUSULA', 'OUTRO');

CREATE TABLE "PortalSeguroApoliceItem" (
    "id" TEXT NOT NULL,
    "apoliceId" TEXT NOT NULL,
    "tipo" "PortalSeguroItemTipo" NOT NULL,
    "descricao" TEXT NOT NULL,
    "detalhes" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PortalSeguroApoliceItem_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "PortalSeguroApoliceItem_apoliceId_sortOrder_idx" ON "PortalSeguroApoliceItem"("apoliceId", "sortOrder");

ALTER TABLE "PortalSeguroApoliceItem" ADD CONSTRAINT "PortalSeguroApoliceItem_apoliceId_fkey" FOREIGN KEY ("apoliceId") REFERENCES "PortalSeguroApolice"("id") ON DELETE CASCADE ON UPDATE CASCADE;
