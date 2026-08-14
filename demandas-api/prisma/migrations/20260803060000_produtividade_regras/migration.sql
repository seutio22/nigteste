-- CreateTable
CREATE TABLE "produtividade_regras" (
    "id" TEXT NOT NULL,
    "pageKey" TEXT NOT NULL,
    "tipo1Id" TEXT,
    "tipo2Id" TEXT,
    "qtdSistemas" INTEGER,
    "qtdUsuarios" INTEGER,
    "qtdClientes" INTEGER,
    "qtdRetornos" INTEGER,
    "qtdItens" INTEGER,
    "tempoPrevistoSeconds" INTEGER,
    "pesoPontos" DOUBLE PRECISION,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "produtividade_regras_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "produtividade_regras_pageKey_idx" ON "produtividade_regras"("pageKey");

-- CreateIndex
CREATE INDEX "produtividade_regras_pageKey_ativo_idx" ON "produtividade_regras"("pageKey", "ativo");
