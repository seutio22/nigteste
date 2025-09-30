-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_TipoDemanda" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "nome" TEXT NOT NULL,
    "descricao" TEXT,
    "tipoServicoId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "TipoDemanda_tipoServicoId_fkey" FOREIGN KEY ("tipoServicoId") REFERENCES "TipoServico" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_TipoDemanda" ("createdAt", "descricao", "id", "nome", "updatedAt") SELECT "createdAt", "descricao", "id", "nome", "updatedAt" FROM "TipoDemanda";
DROP TABLE "TipoDemanda";
ALTER TABLE "new_TipoDemanda" RENAME TO "TipoDemanda";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
