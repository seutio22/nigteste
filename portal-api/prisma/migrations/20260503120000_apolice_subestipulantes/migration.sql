-- Subestipulantes estruturados por apólice; campo texto `subestipulante` passa a opcional (resumo).

CREATE TYPE "PortalSubestipulanteStatus" AS ENUM ('ATIVO', 'CANCELADO');

ALTER TABLE "PortalSeguroApolice" ALTER COLUMN "subestipulante" DROP NOT NULL;

CREATE TABLE "PortalSeguroApoliceSubestipulante" (
    "id" TEXT NOT NULL,
    "apoliceId" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "razaoSocial" TEXT NOT NULL,
    "cnpj" TEXT NOT NULL,
    "codigoSub" TEXT NOT NULL,
    "status" "PortalSubestipulanteStatus" NOT NULL DEFAULT 'ATIVO',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PortalSeguroApoliceSubestipulante_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "PortalSeguroApoliceSubestipulante_apoliceId_sortOrder_idx" ON "PortalSeguroApoliceSubestipulante"("apoliceId", "sortOrder");

ALTER TABLE "PortalSeguroApoliceSubestipulante" ADD CONSTRAINT "PortalSeguroApoliceSubestipulante_apoliceId_fkey" FOREIGN KEY ("apoliceId") REFERENCES "PortalSeguroApolice"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Migra linha única a partir do texto legado (se houver).
INSERT INTO "PortalSeguroApoliceSubestipulante" ("id", "apoliceId", "sortOrder", "razaoSocial", "cnpj", "codigoSub", "status", "createdAt", "updatedAt")
SELECT gen_random_uuid()::text, a.id, 0, left(trim(a."subestipulante"), 500), '', '', 'ATIVO'::"PortalSubestipulanteStatus", CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM "PortalSeguroApolice" a
WHERE a."subestipulante" IS NOT NULL AND trim(a."subestipulante") <> '' AND trim(a."subestipulante") <> '—';
