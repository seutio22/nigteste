-- CreateTable
CREATE TABLE "KanbanColumnPref" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "enabledColumns" TEXT NOT NULL DEFAULT '[]',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "KanbanColumnPref_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "KanbanColumnPref_userId_key" ON "KanbanColumnPref"("userId");
