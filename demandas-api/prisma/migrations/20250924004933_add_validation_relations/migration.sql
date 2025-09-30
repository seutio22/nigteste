-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Validacao" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "demandaId" TEXT,
    "analistaId" TEXT NOT NULL,
    "userId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'Pendente',
    "dataInicio" DATETIME,
    "dataFim" DATETIME,
    "observacoes" TEXT,
    "clienteId" TEXT,
    "contratoId" TEXT,
    "operadoraId" TEXT,
    "produtoId" TEXT,
    "estruturaEdge" TEXT,
    "estruturaMove" TEXT,
    "formalizacao" TEXT,
    "itensPendentes" INTEGER,
    "itensConcluidos" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Validacao_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Validacao_analistaId_fkey" FOREIGN KEY ("analistaId") REFERENCES "Analista" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Validacao_demandaId_fkey" FOREIGN KEY ("demandaId") REFERENCES "Demanda" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Validacao_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "Cliente" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Validacao_contratoId_fkey" FOREIGN KEY ("contratoId") REFERENCES "Contrato" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Validacao_operadoraId_fkey" FOREIGN KEY ("operadoraId") REFERENCES "Operadora" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Validacao_produtoId_fkey" FOREIGN KEY ("produtoId") REFERENCES "Produto" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Validacao" ("analistaId", "createdAt", "dataFim", "dataInicio", "demandaId", "estruturaEdge", "estruturaMove", "formalizacao", "id", "itensConcluidos", "itensPendentes", "observacoes", "status", "updatedAt", "userId") SELECT "analistaId", "createdAt", "dataFim", "dataInicio", "demandaId", "estruturaEdge", "estruturaMove", "formalizacao", "id", "itensConcluidos", "itensPendentes", "observacoes", "status", "updatedAt", "userId" FROM "Validacao";
DROP TABLE "Validacao";
ALTER TABLE "new_Validacao" RENAME TO "Validacao";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
