-- CreateTable
CREATE TABLE "PlacementOperadoraLogo" (
    "id" TEXT NOT NULL,
    "operadoraId" TEXT NOT NULL,
    "nomeOriginal" TEXT NOT NULL,
    "storedName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlacementOperadoraLogo_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PlacementOperadoraLogo_operadoraId_key" ON "PlacementOperadoraLogo"("operadoraId");

-- AddForeignKey
ALTER TABLE "PlacementOperadoraLogo" ADD CONSTRAINT "PlacementOperadoraLogo_operadoraId_fkey" FOREIGN KEY ("operadoraId") REFERENCES "Operadora"("id") ON DELETE CASCADE ON UPDATE CASCADE;
