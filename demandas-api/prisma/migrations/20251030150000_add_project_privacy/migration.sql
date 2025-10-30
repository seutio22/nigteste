-- Add privacy fields to Project
ALTER TABLE "Project"
ADD COLUMN IF NOT EXISTS "ownerId" TEXT NULL,
ADD COLUMN IF NOT EXISTS "isPrivate" BOOLEAN NOT NULL DEFAULT FALSE;

-- Optional indexes to improve queries
CREATE INDEX IF NOT EXISTS "idx_project_ownerId" ON "Project" ("ownerId");
CREATE INDEX IF NOT EXISTS "idx_project_isPrivate" ON "Project" ("isPrivate");


