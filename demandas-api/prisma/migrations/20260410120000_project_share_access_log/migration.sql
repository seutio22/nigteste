-- CreateTable
CREATE TABLE "ProjectShareAccessLog" (
    "id" TEXT NOT NULL,
    "shareTokenId" TEXT NOT NULL,
    "ipAddress" TEXT NOT NULL,
    "userAgent" TEXT,
    "accessedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProjectShareAccessLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ProjectShareAccessLog_shareTokenId_accessedAt_idx" ON "ProjectShareAccessLog"("shareTokenId", "accessedAt");

-- AddForeignKey
ALTER TABLE "ProjectShareAccessLog" ADD CONSTRAINT "ProjectShareAccessLog_shareTokenId_fkey" FOREIGN KEY ("shareTokenId") REFERENCES "ProjectShareToken"("id") ON DELETE CASCADE ON UPDATE CASCADE;
