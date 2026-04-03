-- Catálogo de campos Nexus + mapeamento nos formulários (sem JSON manual no admin)
CREATE TYPE "NexusFieldValueType" AS ENUM ('TEXT', 'TEXTAREA', 'NUMBER', 'DATE', 'SELECT', 'BOOLEAN');

CREATE TABLE "PortalNexusField" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "description" TEXT,
    "valueType" "NexusFieldValueType" NOT NULL DEFAULT 'TEXT',
    "enumOptions" JSONB,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PortalNexusField_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PortalNexusField_key_key" ON "PortalNexusField"("key");
