-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "role" TEXT NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Area" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,

    CONSTRAINT "Area_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Analista" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,

    CONSTRAINT "Analista_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Operadora" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,

    CONSTRAINT "Operadora_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Produto" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,

    CONSTRAINT "Produto_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Sistema" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,

    CONSTRAINT "Sistema_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Cliente" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "grupoEconomico" TEXT,

    CONSTRAINT "Cliente_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Contrato" (
    "id" TEXT NOT NULL,
    "codigo" TEXT NOT NULL,
    "grupoEconomico" TEXT NOT NULL,

    CONSTRAINT "Contrato_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TipoServico" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,

    CONSTRAINT "TipoServico_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TipoDemanda" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "tipoServicoId" TEXT,

    CONSTRAINT "TipoDemanda_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Demanda" (
    "id" TEXT NOT NULL,
    "ticket" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "analistaId" TEXT,
    "solicitante" TEXT,
    "areaId" TEXT,
    "tipoId" TEXT,
    "descricao" TEXT,
    "clienteId" TEXT NOT NULL,
    "contratoId" TEXT NOT NULL,
    "operadoraId" TEXT NOT NULL,
    "produtoId" TEXT NOT NULL,
    "sistemaId" TEXT,
    "tipoServicoId" TEXT,
    "dataInicio" TIMESTAMP(3),
    "dataFinal" TIMESTAMP(3),
    "qtdRetornos" INTEGER DEFAULT 0,
    "qualidade" TEXT,
    "observacoes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Demanda_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Validacao" (
    "id" TEXT NOT NULL,
    "analistaId" TEXT NOT NULL,
    "dataInicio" TIMESTAMP(3) NOT NULL,
    "dataFinal" TIMESTAMP(3),
    "status" TEXT NOT NULL,
    "periodicidade" TEXT,
    "ticket" TEXT,
    "solicitante" TEXT,
    "areaId" TEXT NOT NULL,
    "demanda" TEXT,
    "tipoId" TEXT NOT NULL,
    "descricao" TEXT NOT NULL,
    "total" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "Validacao_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Reajuste" (
    "id" TEXT NOT NULL,
    "mes" TEXT NOT NULL,
    "ano" TEXT NOT NULL,
    "filial" TEXT,
    "operadoraId" TEXT NOT NULL,
    "responsavelAnalistaId" TEXT NOT NULL,
    "clienteId" TEXT,
    "contratoId" TEXT,
    "produtoId" TEXT,
    "total" DOUBLE PRECISION,

    CONSTRAINT "Reajuste_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Log" (
    "id" TEXT NOT NULL,
    "demandaId" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "usuario" TEXT NOT NULL,
    "tipoEvento" TEXT NOT NULL,
    "campo" TEXT,
    "de" TEXT,
    "para" TEXT,
    "comentario" TEXT,

    CONSTRAINT "Log_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Demanda_ticket_key" ON "Demanda"("ticket");

-- AddForeignKey
ALTER TABLE "TipoDemanda" ADD CONSTRAINT "TipoDemanda_tipoServicoId_fkey" FOREIGN KEY ("tipoServicoId") REFERENCES "TipoServico"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Demanda" ADD CONSTRAINT "Demanda_analistaId_fkey" FOREIGN KEY ("analistaId") REFERENCES "Analista"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Demanda" ADD CONSTRAINT "Demanda_areaId_fkey" FOREIGN KEY ("areaId") REFERENCES "Area"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Demanda" ADD CONSTRAINT "Demanda_tipoId_fkey" FOREIGN KEY ("tipoId") REFERENCES "TipoDemanda"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Demanda" ADD CONSTRAINT "Demanda_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "Cliente"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Demanda" ADD CONSTRAINT "Demanda_contratoId_fkey" FOREIGN KEY ("contratoId") REFERENCES "Contrato"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Demanda" ADD CONSTRAINT "Demanda_operadoraId_fkey" FOREIGN KEY ("operadoraId") REFERENCES "Operadora"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Demanda" ADD CONSTRAINT "Demanda_produtoId_fkey" FOREIGN KEY ("produtoId") REFERENCES "Produto"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Demanda" ADD CONSTRAINT "Demanda_sistemaId_fkey" FOREIGN KEY ("sistemaId") REFERENCES "Sistema"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Demanda" ADD CONSTRAINT "Demanda_tipoServicoId_fkey" FOREIGN KEY ("tipoServicoId") REFERENCES "TipoServico"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Validacao" ADD CONSTRAINT "Validacao_analistaId_fkey" FOREIGN KEY ("analistaId") REFERENCES "Analista"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Validacao" ADD CONSTRAINT "Validacao_areaId_fkey" FOREIGN KEY ("areaId") REFERENCES "Area"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Validacao" ADD CONSTRAINT "Validacao_tipoId_fkey" FOREIGN KEY ("tipoId") REFERENCES "TipoDemanda"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Reajuste" ADD CONSTRAINT "Reajuste_operadoraId_fkey" FOREIGN KEY ("operadoraId") REFERENCES "Operadora"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Reajuste" ADD CONSTRAINT "Reajuste_responsavelAnalistaId_fkey" FOREIGN KEY ("responsavelAnalistaId") REFERENCES "Analista"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Reajuste" ADD CONSTRAINT "Reajuste_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "Cliente"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Reajuste" ADD CONSTRAINT "Reajuste_contratoId_fkey" FOREIGN KEY ("contratoId") REFERENCES "Contrato"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Reajuste" ADD CONSTRAINT "Reajuste_produtoId_fkey" FOREIGN KEY ("produtoId") REFERENCES "Produto"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Log" ADD CONSTRAINT "Log_demandaId_fkey" FOREIGN KEY ("demandaId") REFERENCES "Demanda"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
