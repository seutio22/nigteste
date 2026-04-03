-- Snapshots dos dados mestres Nexus (sincronizados a partir da API demandas/Nexus)
CREATE TABLE "PortalNexusEntitySnapshot" (
    "entityKey" TEXT NOT NULL,
    "rows" JSONB NOT NULL DEFAULT '[]',
    "rowCount" INTEGER NOT NULL DEFAULT 0,
    "syncedAt" TIMESTAMP(3),
    "lastError" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PortalNexusEntitySnapshot_pkey" PRIMARY KEY ("entityKey")
);
