-- CreateTable
CREATE TABLE "ProjectMember" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "projectId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "permissions" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ProjectMember_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ProjectMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ProjectExternalMember" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "projectId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "company" TEXT,
    "role" TEXT NOT NULL,
    "accessLevel" TEXT NOT NULL DEFAULT 'view',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ProjectExternalMember_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ProjectSubtask" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "projectTaskId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "priority" TEXT NOT NULL,
    "assigneeId" TEXT,
    "startDate" DATETIME,
    "dueDate" DATETIME,
    "estimatedHours" REAL,
    "actualHours" REAL,
    "progress" INTEGER NOT NULL DEFAULT 0,
    "budget" REAL,
    "tags" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "code" TEXT NOT NULL,
    "attachments" TEXT NOT NULL,
    "comments" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ProjectSubtask_projectTaskId_fkey" FOREIGN KEY ("projectTaskId") REFERENCES "ProjectTask" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ProjectSubtask_assigneeId_fkey" FOREIGN KEY ("assigneeId") REFERENCES "Analista" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ProjectShareToken" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "projectId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "name" TEXT,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "allowedViews" TEXT NOT NULL DEFAULT 'overview,timeline,gantt,team,resources',
    "expiresAt" DATETIME,
    "viewCount" INTEGER NOT NULL DEFAULT 0,
    "lastViewAt" DATETIME,
    "createdBy" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ProjectShareToken_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Permission" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "module" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "UserPermission" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "permissionId" TEXT NOT NULL,
    "granted" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "UserPermission_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "UserPermission_permissionId_fkey" FOREIGN KEY ("permissionId") REFERENCES "Permission" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT,
    "role" TEXT NOT NULL DEFAULT 'analista',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "viewOwnDataOnly" BOOLEAN NOT NULL DEFAULT false,
    "permissions" TEXT,
    "lastLogin" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "KanbanTicket" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "status" TEXT NOT NULL,
    "priority" TEXT NOT NULL,
    "assignee" TEXT,
    "dueDate" DATETIME,
    "tags" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "KanbanTicket_assignee_fkey" FOREIGN KEY ("assignee") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Atendimento" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "ticket" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "descricao" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'Aberto',
    "prioridade" TEXT NOT NULL DEFAULT 'Média',
    "categoria" TEXT NOT NULL,
    "solicitante" TEXT NOT NULL,
    "emailSolicitante" TEXT NOT NULL,
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
    CONSTRAINT "Atendimento_analistaId_fkey" FOREIGN KEY ("analistaId") REFERENCES "Analista" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Atendimento_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Atendimento_areaId_fkey" FOREIGN KEY ("areaId") REFERENCES "Area" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Atendimento_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "Cliente" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Atendimento_contratoId_fkey" FOREIGN KEY ("contratoId") REFERENCES "Contrato" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Atendimento_operadoraId_fkey" FOREIGN KEY ("operadoraId") REFERENCES "Operadora" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Atendimento_produtoId_fkey" FOREIGN KEY ("produtoId") REFERENCES "Produto" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Atendimento_sistemaId_fkey" FOREIGN KEY ("sistemaId") REFERENCES "Sistema" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Atendimento_tipoServicoId_fkey" FOREIGN KEY ("tipoServicoId") REFERENCES "TipoServico" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Atendimento_tipoId_fkey" FOREIGN KEY ("tipoId") REFERENCES "TipoDemanda" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Atendimento" ("analistaId", "anexos", "areaId", "categoria", "clienteId", "comentarios", "contratoId", "createdAt", "dataAbertura", "dataFechamento", "dataResolucao", "descricao", "emailSolicitante", "id", "operadoraId", "prioridade", "produtoId", "satisfacao", "sistemaId", "solicitante", "status", "tags", "telefoneSolicitante", "tempoResolucao", "ticket", "tipoId", "tipoServicoId", "titulo", "updatedAt") SELECT "analistaId", "anexos", "areaId", "categoria", "clienteId", "comentarios", "contratoId", "createdAt", "dataAbertura", "dataFechamento", "dataResolucao", "descricao", "emailSolicitante", "id", "operadoraId", "prioridade", "produtoId", "satisfacao", "sistemaId", "solicitante", "status", "tags", "telefoneSolicitante", "tempoResolucao", "ticket", "tipoId", "tipoServicoId", "titulo", "updatedAt" FROM "Atendimento";
DROP TABLE "Atendimento";
ALTER TABLE "new_Atendimento" RENAME TO "Atendimento";
CREATE UNIQUE INDEX "Atendimento_ticket_key" ON "Atendimento"("ticket");
CREATE TABLE "new_Comunicado" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "titulo" TEXT NOT NULL,
    "conteudo" TEXT NOT NULL,
    "categoria" TEXT NOT NULL,
    "prioridade" TEXT NOT NULL,
    "autor" TEXT NOT NULL,
    "autorId" TEXT NOT NULL,
    "userId" TEXT,
    "publicado" BOOLEAN NOT NULL DEFAULT false,
    "dataPublicacao" DATETIME,
    "dataExpiracao" DATETIME,
    "tags" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Comunicado_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Comunicado" ("autor", "autorId", "categoria", "conteudo", "createdAt", "dataExpiracao", "dataPublicacao", "id", "prioridade", "publicado", "tags", "titulo", "updatedAt") SELECT "autor", "autorId", "categoria", "conteudo", "createdAt", "dataExpiracao", "dataPublicacao", "id", "prioridade", "publicado", "tags", "titulo", "updatedAt" FROM "Comunicado";
DROP TABLE "Comunicado";
ALTER TABLE "new_Comunicado" RENAME TO "Comunicado";
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
    "clienteId" TEXT NOT NULL,
    "contratoId" TEXT NOT NULL,
    "operadoraId" TEXT NOT NULL,
    "produtoId" TEXT NOT NULL,
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
    CONSTRAINT "Demanda_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "Cliente" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Demanda_contratoId_fkey" FOREIGN KEY ("contratoId") REFERENCES "Contrato" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Demanda_operadoraId_fkey" FOREIGN KEY ("operadoraId") REFERENCES "Operadora" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Demanda_produtoId_fkey" FOREIGN KEY ("produtoId") REFERENCES "Produto" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Demanda_tipoServicoId_fkey" FOREIGN KEY ("tipoServicoId") REFERENCES "TipoServico" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Demanda_sistemaId_fkey" FOREIGN KEY ("sistemaId") REFERENCES "Sistema" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Demanda" ("analistaId", "areaId", "clienteId", "contratoId", "createdAt", "dataFinal", "dataInicio", "descricao", "id", "observacoes", "operadoraId", "periodicidade", "produtoId", "qtdRetornos", "qualidade", "sistemaId", "solicitante", "status", "ticket", "tipoId", "tipoServicoId", "updatedAt") SELECT "analistaId", "areaId", "clienteId", "contratoId", "createdAt", "dataFinal", "dataInicio", "descricao", "id", "observacoes", "operadoraId", "periodicidade", "produtoId", "qtdRetornos", "qualidade", "sistemaId", "solicitante", "status", "ticket", "tipoId", "tipoServicoId", "updatedAt" FROM "Demanda";
DROP TABLE "Demanda";
ALTER TABLE "new_Demanda" RENAME TO "Demanda";
CREATE UNIQUE INDEX "Demanda_ticket_key" ON "Demanda"("ticket");
CREATE TABLE "new_Project" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "priority" TEXT NOT NULL,
    "startDate" DATETIME NOT NULL,
    "endDate" DATETIME NOT NULL,
    "progress" INTEGER NOT NULL DEFAULT 0,
    "budget" REAL,
    "clientId" TEXT,
    "managerId" TEXT NOT NULL,
    "team" TEXT NOT NULL,
    "tags" TEXT NOT NULL,
    "color" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Project_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Cliente" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Project_managerId_fkey" FOREIGN KEY ("managerId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Project" ("budget", "clientId", "color", "createdAt", "description", "endDate", "id", "managerId", "name", "priority", "progress", "startDate", "status", "tags", "team", "updatedAt") SELECT "budget", "clientId", "color", "createdAt", "description", "endDate", "id", "managerId", "name", "priority", "progress", "startDate", "status", "tags", "team", "updatedAt" FROM "Project";
DROP TABLE "Project";
ALTER TABLE "new_Project" RENAME TO "Project";
CREATE TABLE "new_ProjectMilestone" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "projectId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "dueDate" DATETIME NOT NULL,
    "completed" BOOLEAN NOT NULL DEFAULT false,
    "tasks" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ProjectMilestone_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_ProjectMilestone" ("completed", "createdAt", "description", "dueDate", "id", "projectId", "tasks", "title", "updatedAt") SELECT "completed", "createdAt", "description", "dueDate", "id", "projectId", "tasks", "title", "updatedAt" FROM "ProjectMilestone";
DROP TABLE "ProjectMilestone";
ALTER TABLE "new_ProjectMilestone" RENAME TO "ProjectMilestone";
CREATE TABLE "new_ProjectTask" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "projectId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "priority" TEXT NOT NULL,
    "assigneeId" TEXT,
    "dueDate" DATETIME,
    "estimatedHours" REAL,
    "actualHours" REAL,
    "dependencies" TEXT NOT NULL,
    "subtasks" TEXT NOT NULL,
    "attachments" TEXT NOT NULL,
    "comments" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ProjectTask_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ProjectTask_assigneeId_fkey" FOREIGN KEY ("assigneeId") REFERENCES "Analista" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_ProjectTask" ("actualHours", "assigneeId", "attachments", "comments", "createdAt", "dependencies", "description", "dueDate", "estimatedHours", "id", "priority", "projectId", "status", "subtasks", "title", "updatedAt") SELECT "actualHours", "assigneeId", "attachments", "comments", "createdAt", "dependencies", "description", "dueDate", "estimatedHours", "id", "priority", "projectId", "status", "subtasks", "title", "updatedAt" FROM "ProjectTask";
DROP TABLE "ProjectTask";
ALTER TABLE "new_ProjectTask" RENAME TO "ProjectTask";
CREATE TABLE "new_ProjectTimeline" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "projectId" TEXT NOT NULL,
    "startDate" DATETIME NOT NULL,
    "endDate" DATETIME NOT NULL,
    "phases" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ProjectTimeline_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_ProjectTimeline" ("createdAt", "endDate", "id", "phases", "projectId", "startDate", "updatedAt") SELECT "createdAt", "endDate", "id", "phases", "projectId", "startDate", "updatedAt" FROM "ProjectTimeline";
DROP TABLE "ProjectTimeline";
ALTER TABLE "new_ProjectTimeline" RENAME TO "ProjectTimeline";
CREATE TABLE "new_Reajuste" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "demandaId" TEXT NOT NULL,
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
    CONSTRAINT "Reajuste_demandaId_fkey" FOREIGN KEY ("demandaId") REFERENCES "Demanda" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Reajuste_analistaId_fkey" FOREIGN KEY ("analistaId") REFERENCES "Analista" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Reajuste_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Reajuste" ("analistaId", "aprovado", "createdAt", "dataAprovacao", "demandaId", "id", "motivo", "percentual", "responsavelAnalista", "updatedAt", "valorAnterior", "valorNovo") SELECT "analistaId", "aprovado", "createdAt", "dataAprovacao", "demandaId", "id", "motivo", "percentual", "responsavelAnalista", "updatedAt", "valorAnterior", "valorNovo" FROM "Reajuste";
DROP TABLE "Reajuste";
ALTER TABLE "new_Reajuste" RENAME TO "Reajuste";
CREATE TABLE "new_Validacao" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "demandaId" TEXT NOT NULL,
    "analistaId" TEXT NOT NULL,
    "userId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'Pendente',
    "dataInicio" DATETIME,
    "dataFim" DATETIME,
    "observacoes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Validacao_demandaId_fkey" FOREIGN KEY ("demandaId") REFERENCES "Demanda" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Validacao_analistaId_fkey" FOREIGN KEY ("analistaId") REFERENCES "Analista" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Validacao_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Validacao" ("analistaId", "createdAt", "dataFim", "dataInicio", "demandaId", "id", "observacoes", "status", "updatedAt") SELECT "analistaId", "createdAt", "dataFim", "dataInicio", "demandaId", "id", "observacoes", "status", "updatedAt" FROM "Validacao";
DROP TABLE "Validacao";
ALTER TABLE "new_Validacao" RENAME TO "Validacao";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "ProjectMember_projectId_userId_key" ON "ProjectMember"("projectId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "ProjectShareToken_token_key" ON "ProjectShareToken"("token");

-- CreateIndex
CREATE UNIQUE INDEX "Permission_name_key" ON "Permission"("name");

-- CreateIndex
CREATE UNIQUE INDEX "UserPermission_userId_permissionId_key" ON "UserPermission"("userId", "permissionId");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
