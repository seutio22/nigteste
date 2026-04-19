-- Listas reutilizáveis do portal (filiais, etc.)

CREATE TABLE "PortalLookupList" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "description" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PortalLookupList_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PortalLookupList_key_key" ON "PortalLookupList"("key");

CREATE TABLE "PortalLookupItem" (
    "id" TEXT NOT NULL,
    "listId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PortalLookupItem_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "PortalLookupItem_listId_sortOrder_idx" ON "PortalLookupItem"("listId", "sortOrder");

CREATE UNIQUE INDEX "PortalLookupItem_listId_value_key" ON "PortalLookupItem"("listId", "value");

ALTER TABLE "PortalLookupItem" ADD CONSTRAINT "PortalLookupItem_listId_fkey" FOREIGN KEY ("listId") REFERENCES "PortalLookupList"("id") ON DELETE CASCADE ON UPDATE CASCADE;
