-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Demanda" (
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
    CONSTRAINT "Demanda_analistaId_fkey" FOREIGN KEY ("analistaId") REFERENCES "Analista" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Demanda_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Demanda_areaId_fkey" FOREIGN KEY ("areaId") REFERENCES "Area" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Demanda_tipoId_fkey" FOREIGN KEY ("tipoId") REFERENCES "TipoDemanda" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Demanda_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "Cliente" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Demanda_contratoId_fkey" FOREIGN KEY ("contratoId") REFERENCES "Contrato" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Demanda_operadoraId_fkey" FOREIGN KEY ("operadoraId") REFERENCES "Operadora" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Demanda_produtoId_fkey" FOREIGN KEY ("produtoId") REFERENCES "Produto" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Demanda_sistemaId_fkey" FOREIGN KEY ("sistemaId") REFERENCES "Sistema" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Demanda" ("analistaId", "areaId", "clienteId", "contratoId", "createdAt", "dataFinal", "dataInicio", "descricao", "id", "nome", "observacoes", "operadoraId", "periodicidade", "produtoId", "qtdRetornos", "qualidade", "sistemaId", "solicitante", "status", "ticket", "tipoId", "tipoServicoId", "updatedAt", "userId") SELECT "analistaId", "areaId", "clienteId", "contratoId", "createdAt", "dataFinal", "dataInicio", "descricao", "id", "nome", "observacoes", "operadoraId", "periodicidade", "produtoId", "qtdRetornos", "qualidade", "sistemaId", "solicitante", "status", "ticket", "tipoId", "tipoServicoId", "updatedAt", "userId" FROM "Demanda";
DROP TABLE "Demanda";
ALTER TABLE "new_Demanda" RENAME TO "Demanda";
CREATE UNIQUE INDEX "Demanda_ticket_key" ON "Demanda"("ticket");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
