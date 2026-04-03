-- Prioridade, fila, atribuição operacional e hierarquia gestor/colaborador
CREATE TYPE "PortalCasePriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'URGENT');

ALTER TYPE "PortalUserRole" ADD VALUE 'PORTAL_OPERATOR';

ALTER TABLE "PortalUser" ADD COLUMN "parentManagerId" TEXT;

ALTER TABLE "PortalCase" ADD COLUMN "priority" "PortalCasePriority" NOT NULL DEFAULT 'MEDIUM';
ALTER TABLE "PortalCase" ADD COLUMN "queueLabel" TEXT;
ALTER TABLE "PortalCase" ADD COLUMN "assignedToUserId" TEXT;

ALTER TABLE "PortalUser" ADD CONSTRAINT "PortalUser_parentManagerId_fkey" FOREIGN KEY ("parentManagerId") REFERENCES "PortalUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "PortalCase" ADD CONSTRAINT "PortalCase_assignedToUserId_fkey" FOREIGN KEY ("assignedToUserId") REFERENCES "PortalUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;
