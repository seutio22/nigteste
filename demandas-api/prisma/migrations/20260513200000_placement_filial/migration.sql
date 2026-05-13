-- CreateTable
CREATE TABLE "PlacementFilial" (
    "id" TEXT NOT NULL,
    "razaoSocial" TEXT NOT NULL,
    "cnpj" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'Ativo',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlacementFilial_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PlacementFilial_cnpj_key" ON "PlacementFilial"("cnpj");

-- CreateIndex
CREATE INDEX "PlacementFilial_razaoSocial_idx" ON "PlacementFilial"("razaoSocial");
