/*
  Warnings:

  - You are about to drop the column `nome` on the `Demanda` table. All the data in the column will be lost.
  - You are about to drop the column `nome` on the `Manutencao` table. All the data in the column will be lost.
  - You are about to drop the column `tipoServicoId` on the `TipoDemanda` table. All the data in the column will be lost.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Demanda" (
    "id" TEXT NOT NULL PRIMARY KEY,
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
    "qtdClientesVinculados" INTEGER,
    "usuariosEmpresa" INTEGER,
    CONSTRAINT "Demanda_sistemaId_fkey" FOREIGN KEY ("sistemaId") REFERENCES "Sistema" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Demanda_tipoServicoId_fkey" FOREIGN KEY ("tipoServicoId") REFERENCES "TipoServico" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Demanda_produtoId_fkey" FOREIGN KEY ("produtoId") REFERENCES "Produto" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Demanda_operadoraId_fkey" FOREIGN KEY ("operadoraId") REFERENCES "Operadora" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Demanda_contratoId_fkey" FOREIGN KEY ("contratoId") REFERENCES "Contrato" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Demanda_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "Cliente" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Demanda_tipoId_fkey" FOREIGN KEY ("tipoId") REFERENCES "TipoDemanda" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Demanda_areaId_fkey" FOREIGN KEY ("areaId") REFERENCES "Area" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Demanda_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Demanda_analistaId_fkey" FOREIGN KEY ("analistaId") REFERENCES "Analista" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Demanda" ("analistaId", "areaId", "clienteId", "contratoId", "createdAt", "dataFinal", "dataInicio", "descricao", "id", "observacoes", "operadoraId", "periodicidade", "produtoId", "qtdRetornos", "qualidade", "sistemaId", "solicitante", "status", "ticket", "tipoId", "tipoServicoId", "updatedAt", "userId") SELECT "analistaId", "areaId", "clienteId", "contratoId", "createdAt", "dataFinal", "dataInicio", "descricao", "id", "observacoes", "operadoraId", "periodicidade", "produtoId", "qtdRetornos", "qualidade", "sistemaId", "solicitante", "status", "ticket", "tipoId", "tipoServicoId", "updatedAt", "userId" FROM "Demanda";
DROP TABLE "Demanda";
ALTER TABLE "new_Demanda" RENAME TO "Demanda";
CREATE UNIQUE INDEX "Demanda_ticket_key" ON "Demanda"("ticket");
CREATE TABLE "new_Manutencao" (
    "id" TEXT NOT NULL PRIMARY KEY,
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
    "qtdClientesVinculados" INTEGER,
    "usuariosEmpresa" INTEGER,
    "observacoes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Manutencao_sistemaId_fkey" FOREIGN KEY ("sistemaId") REFERENCES "Sistema" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Manutencao_tipoServicoId_fkey" FOREIGN KEY ("tipoServicoId") REFERENCES "TipoServico" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Manutencao_produtoId_fkey" FOREIGN KEY ("produtoId") REFERENCES "Produto" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Manutencao_operadoraId_fkey" FOREIGN KEY ("operadoraId") REFERENCES "Operadora" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Manutencao_contratoId_fkey" FOREIGN KEY ("contratoId") REFERENCES "Contrato" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Manutencao_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "Cliente" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Manutencao_tipoId_fkey" FOREIGN KEY ("tipoId") REFERENCES "Padrao" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Manutencao_areaId_fkey" FOREIGN KEY ("areaId") REFERENCES "Area" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Manutencao_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Manutencao_analistaId_fkey" FOREIGN KEY ("analistaId") REFERENCES "Analista" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Manutencao" ("analistaId", "areaId", "clienteId", "contratoId", "createdAt", "dataFinal", "dataInicio", "descricao", "id", "observacoes", "operadoraId", "periodicidade", "produtoId", "qtdRetornos", "qualidade", "sistemaId", "solicitante", "status", "ticket", "tipoId", "tipoServicoId", "updatedAt", "userId") SELECT "analistaId", "areaId", "clienteId", "contratoId", "createdAt", "dataFinal", "dataInicio", "descricao", "id", "observacoes", "operadoraId", "periodicidade", "produtoId", "qtdRetornos", "qualidade", "sistemaId", "solicitante", "status", "ticket", "tipoId", "tipoServicoId", "updatedAt", "userId" FROM "Manutencao";
DROP TABLE "Manutencao";
ALTER TABLE "new_Manutencao" RENAME TO "Manutencao";
CREATE UNIQUE INDEX "Manutencao_ticket_key" ON "Manutencao"("ticket");
CREATE TABLE "new_TipoDemanda" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "nome" TEXT NOT NULL,
    "descricao" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_TipoDemanda" ("createdAt", "descricao", "id", "nome", "updatedAt") SELECT "createdAt", "descricao", "id", "nome", "updatedAt" FROM "TipoDemanda";
DROP TABLE "TipoDemanda";
ALTER TABLE "new_TipoDemanda" RENAME TO "TipoDemanda";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
