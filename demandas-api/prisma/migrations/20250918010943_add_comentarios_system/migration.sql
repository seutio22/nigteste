/*
  Warnings:

  - You are about to drop the `ComunicadoReacao` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the column `periodicidade` on the `Manutencao` table. All the data in the column will be lost.
  - Added the required column `updatedAt` to the `ComunicadoComentario` table without a default value. This is not possible if the table is not empty.

*/
-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "ComunicadoReacao";
PRAGMA foreign_keys=on;

-- CreateTable
CREATE TABLE "TimelineEvent" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "entityId" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "field" TEXT,
    "fromValue" TEXT,
    "toValue" TEXT,
    "comment" TEXT,
    "userId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TimelineEvent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Atendimento" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "ticket" TEXT,
    "titulo" TEXT,
    "descricao" TEXT,
    "status" TEXT NOT NULL DEFAULT 'Aberto',
    "prioridade" TEXT NOT NULL DEFAULT 'Média',
    "categoria" TEXT,
    "solicitante" TEXT,
    "emailSolicitante" TEXT,
    "telefoneSolicitante" TEXT,
    "analistaId" TEXT,
    "userId" TEXT,
    "areaId" TEXT,
    "clienteId" TEXT,
    "contratoId" TEXT,
    "operadoraId" TEXT,
    "produtoId" TEXT,
    "sistemaId" TEXT,
    "tipoServicoId" TEXT,
    "tipoId" TEXT,
    "dataAbertura" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dataResolucao" DATETIME,
    "dataFechamento" DATETIME,
    "tempoResolucao" INTEGER,
    "satisfacao" INTEGER,
    "comentarios" TEXT,
    "anexos" TEXT,
    "tags" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Atendimento_tipoId_fkey" FOREIGN KEY ("tipoId") REFERENCES "TipoDemanda" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Atendimento_tipoServicoId_fkey" FOREIGN KEY ("tipoServicoId") REFERENCES "TipoServico" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Atendimento_sistemaId_fkey" FOREIGN KEY ("sistemaId") REFERENCES "Sistema" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Atendimento_produtoId_fkey" FOREIGN KEY ("produtoId") REFERENCES "Produto" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Atendimento_operadoraId_fkey" FOREIGN KEY ("operadoraId") REFERENCES "Operadora" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Atendimento_contratoId_fkey" FOREIGN KEY ("contratoId") REFERENCES "Contrato" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Atendimento_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "Cliente" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Atendimento_areaId_fkey" FOREIGN KEY ("areaId") REFERENCES "Area" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Atendimento_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Atendimento_analistaId_fkey" FOREIGN KEY ("analistaId") REFERENCES "Analista" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Atendimento" ("analistaId", "anexos", "areaId", "categoria", "clienteId", "comentarios", "contratoId", "createdAt", "dataAbertura", "dataFechamento", "dataResolucao", "descricao", "emailSolicitante", "id", "operadoraId", "prioridade", "produtoId", "satisfacao", "sistemaId", "solicitante", "status", "tags", "telefoneSolicitante", "tempoResolucao", "ticket", "tipoId", "tipoServicoId", "titulo", "updatedAt", "userId") SELECT "analistaId", "anexos", "areaId", "categoria", "clienteId", "comentarios", "contratoId", "createdAt", "dataAbertura", "dataFechamento", "dataResolucao", "descricao", "emailSolicitante", "id", "operadoraId", "prioridade", "produtoId", "satisfacao", "sistemaId", "solicitante", "status", "tags", "telefoneSolicitante", "tempoResolucao", "ticket", "tipoId", "tipoServicoId", "titulo", "updatedAt", "userId" FROM "Atendimento";
DROP TABLE "Atendimento";
ALTER TABLE "new_Atendimento" RENAME TO "Atendimento";
CREATE UNIQUE INDEX "Atendimento_ticket_key" ON "Atendimento"("ticket");
CREATE TABLE "new_ComunicadoComentario" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "comunicadoId" TEXT NOT NULL,
    "autor" TEXT NOT NULL,
    "autorId" TEXT NOT NULL,
    "autorRole" TEXT,
    "conteudo" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ativo',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_ComunicadoComentario" ("autor", "autorId", "comunicadoId", "conteudo", "createdAt", "id") SELECT "autor", "autorId", "comunicadoId", "conteudo", "createdAt", "id" FROM "ComunicadoComentario";
DROP TABLE "ComunicadoComentario";
ALTER TABLE "new_ComunicadoComentario" RENAME TO "ComunicadoComentario";
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
    "qtdRetornos" INTEGER,
    "qualidade" TEXT,
    "qtdClientesVinculados" INTEGER,
    "usuariosEmpresa" INTEGER,
    "observacoes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Manutencao_sistemaId_fkey" FOREIGN KEY ("sistemaId") REFERENCES "Sistema" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Manutencao_tipoServicoId_fkey" FOREIGN KEY ("tipoServicoId") REFERENCES "TipoCadastro" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Manutencao_produtoId_fkey" FOREIGN KEY ("produtoId") REFERENCES "Produto" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Manutencao_operadoraId_fkey" FOREIGN KEY ("operadoraId") REFERENCES "Operadora" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Manutencao_contratoId_fkey" FOREIGN KEY ("contratoId") REFERENCES "Contrato" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Manutencao_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "Cliente" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Manutencao_tipoId_fkey" FOREIGN KEY ("tipoId") REFERENCES "Padrao" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Manutencao_areaId_fkey" FOREIGN KEY ("areaId") REFERENCES "Area" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Manutencao_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Manutencao_analistaId_fkey" FOREIGN KEY ("analistaId") REFERENCES "Analista" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Manutencao" ("analistaId", "areaId", "clienteId", "contratoId", "createdAt", "dataFinal", "dataInicio", "descricao", "id", "observacoes", "operadoraId", "produtoId", "qtdClientesVinculados", "qtdRetornos", "qualidade", "sistemaId", "solicitante", "status", "ticket", "tipoId", "tipoServicoId", "updatedAt", "userId", "usuariosEmpresa") SELECT "analistaId", "areaId", "clienteId", "contratoId", "createdAt", "dataFinal", "dataInicio", "descricao", "id", "observacoes", "operadoraId", "produtoId", "qtdClientesVinculados", "qtdRetornos", "qualidade", "sistemaId", "solicitante", "status", "ticket", "tipoId", "tipoServicoId", "updatedAt", "userId", "usuariosEmpresa" FROM "Manutencao";
DROP TABLE "Manutencao";
ALTER TABLE "new_Manutencao" RENAME TO "Manutencao";
CREATE UNIQUE INDEX "Manutencao_ticket_key" ON "Manutencao"("ticket");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
