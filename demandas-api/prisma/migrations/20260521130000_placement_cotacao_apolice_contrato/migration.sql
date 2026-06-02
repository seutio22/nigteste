-- CreateTable
CREATE TABLE "PlacementTipoContratacao" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlacementTipoContratacao_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PlacementTipoContratacao_nome_idx" ON "PlacementTipoContratacao"("nome");

-- CreateTable
CREATE TABLE "PlacementModalidadeContrato" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlacementModalidadeContrato_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PlacementModalidadeContrato_nome_idx" ON "PlacementModalidadeContrato"("nome");

-- CreateTable
CREATE TABLE "PlacementPrazoVigenciaContrato" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlacementPrazoVigenciaContrato_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PlacementPrazoVigenciaContrato_nome_idx" ON "PlacementPrazoVigenciaContrato"("nome");

-- AlterTable
ALTER TABLE "PlacementCotacao" ADD COLUMN "vigenciaApolice" TIMESTAMP(3);
ALTER TABLE "PlacementCotacao" ADD COLUMN "tipoContratacaoId" TEXT;
ALTER TABLE "PlacementCotacao" ADD COLUMN "modalidadeContratoId" TEXT;
ALTER TABLE "PlacementCotacao" ADD COLUMN "prazoVigenciaContratoId" TEXT;
ALTER TABLE "PlacementCotacao" ADD COLUMN "breakEven" TEXT;

-- CreateIndex
CREATE INDEX "PlacementCotacao_tipoContratacaoId_idx" ON "PlacementCotacao"("tipoContratacaoId");
CREATE INDEX "PlacementCotacao_modalidadeContratoId_idx" ON "PlacementCotacao"("modalidadeContratoId");
CREATE INDEX "PlacementCotacao_prazoVigenciaContratoId_idx" ON "PlacementCotacao"("prazoVigenciaContratoId");

-- AddForeignKey
ALTER TABLE "PlacementCotacao" ADD CONSTRAINT "PlacementCotacao_tipoContratacaoId_fkey" FOREIGN KEY ("tipoContratacaoId") REFERENCES "PlacementTipoContratacao"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlacementCotacao" ADD CONSTRAINT "PlacementCotacao_modalidadeContratoId_fkey" FOREIGN KEY ("modalidadeContratoId") REFERENCES "PlacementModalidadeContrato"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlacementCotacao" ADD CONSTRAINT "PlacementCotacao_prazoVigenciaContratoId_fkey" FOREIGN KEY ("prazoVigenciaContratoId") REFERENCES "PlacementPrazoVigenciaContrato"("id") ON DELETE SET NULL ON UPDATE CASCADE;
