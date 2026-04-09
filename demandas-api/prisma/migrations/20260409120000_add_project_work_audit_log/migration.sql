-- CreateTable
CREATE TABLE "ProjectWorkAuditLog" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT,
    "action" TEXT NOT NULL,
    "actorUserId" TEXT,
    "targetLabel" TEXT,
    "metadata" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProjectWorkAuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ProjectWorkAuditLog_projectId_createdAt_idx" ON "ProjectWorkAuditLog"("projectId", "createdAt");

-- CreateIndex
CREATE INDEX "ProjectWorkAuditLog_projectId_entityType_action_idx" ON "ProjectWorkAuditLog"("projectId", "entityType", "action");

-- AddForeignKey
ALTER TABLE "ProjectWorkAuditLog" ADD CONSTRAINT "ProjectWorkAuditLog_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectWorkAuditLog" ADD CONSTRAINT "ProjectWorkAuditLog_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
