-- CreateTable
CREATE TABLE "Manutencao" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "nome" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'Pendente',
    "ticket" TEXT,
    "analistaId" TEXT,
    "userId" TEXT,
    "solicitante" TEXT,
    "areaId" TEXT,
    "tipoId" TEXT,
    "descricao" TEXT,
    "clienteId" TEXT,
    "contratoId" TEXT,
    "operadoraId" TEXT,
    "produtoId" TEXT,
    "tipoServicoId" TEXT,
    "sistemaId" TEXT,
    "dataInicio" DATETIME,
    "dataFinal" DATETIME,
    "periodicidade" TEXT,
    "qtdRetornos" INTEGER,
    "qualidade" TEXT,
    "observacoes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Manutencao_analistaId_fkey" FOREIGN KEY ("analistaId") REFERENCES "Analista" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Manutencao_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Manutencao_areaId_fkey" FOREIGN KEY ("areaId") REFERENCES "Area" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Manutencao_tipoId_fkey" FOREIGN KEY ("tipoId") REFERENCES "TipoDemanda" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Manutencao_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "Cliente" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Manutencao_contratoId_fkey" FOREIGN KEY ("contratoId") REFERENCES "Contrato" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Manutencao_operadoraId_fkey" FOREIGN KEY ("operadoraId") REFERENCES "Operadora" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Manutencao_produtoId_fkey" FOREIGN KEY ("produtoId") REFERENCES "Produto" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Manutencao_tipoServicoId_fkey" FOREIGN KEY ("tipoServicoId") REFERENCES "TipoServico" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Manutencao_sistemaId_fkey" FOREIGN KEY ("sistemaId") REFERENCES "Sistema" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ValidacaoManutencao" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "manutencaoId" TEXT NOT NULL,
    "analistaId" TEXT NOT NULL,
    "userId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'Pendente',
    "dataInicio" DATETIME,
    "dataFim" DATETIME,
    "observacoes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ValidacaoManutencao_manutencaoId_fkey" FOREIGN KEY ("manutencaoId") REFERENCES "Manutencao" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "ValidacaoManutencao_analistaId_fkey" FOREIGN KEY ("analistaId") REFERENCES "Analista" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "ValidacaoManutencao_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ReajusteManutencao" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "manutencaoId" TEXT NOT NULL,
    "analistaId" TEXT,
    "userId" TEXT,
    "responsavelAnalista" TEXT,
    "valorAnterior" REAL,
    "valorNovo" REAL,
    "percentual" REAL,
    "motivo" TEXT,
    "aprovado" BOOLEAN NOT NULL DEFAULT false,
    "dataAprovacao" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ReajusteManutencao_manutencaoId_fkey" FOREIGN KEY ("manutencaoId") REFERENCES "Manutencao" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "ReajusteManutencao_analistaId_fkey" FOREIGN KEY ("analistaId") REFERENCES "Analista" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "ReajusteManutencao_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "Manutencao_ticket_key" ON "Manutencao"("ticket");
