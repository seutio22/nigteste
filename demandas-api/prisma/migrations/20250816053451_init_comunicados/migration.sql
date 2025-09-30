-- CreateTable
CREATE TABLE "Comunicado" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "titulo" TEXT NOT NULL,
    "conteudo" TEXT NOT NULL,
    "categoria" TEXT NOT NULL,
    "prioridade" TEXT NOT NULL,
    "autor" TEXT NOT NULL,
    "autorId" TEXT NOT NULL,
    "publicado" BOOLEAN NOT NULL DEFAULT false,
    "dataPublicacao" DATETIME,
    "dataExpiracao" DATETIME,
    "tags" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "ComunicadoReacao" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "comunicadoId" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "usuarioId" TEXT NOT NULL,
    "usuarioNome" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "ComunicadoComentario" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "comunicadoId" TEXT NOT NULL,
    "autor" TEXT NOT NULL,
    "autorId" TEXT NOT NULL,
    "conteudo" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "ComunicadoVisualizacao" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "comunicadoId" TEXT NOT NULL,
    "usuarioId" TEXT NOT NULL,
    "usuarioNome" TEXT NOT NULL,
    "usuarioRole" TEXT NOT NULL,
    "dataVisualizacao" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "tempoVisualizacao" INTEGER,
    "ipAddress" TEXT,
    "userAgent" TEXT
);
