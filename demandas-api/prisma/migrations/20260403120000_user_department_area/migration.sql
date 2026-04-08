-- AlterTable: vínculo opcional do usuário à área (departamento) cadastrada em Dados → Áreas
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "departmentId" TEXT;

-- Foreign key (PostgreSQL)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'User_departmentId_fkey'
  ) THEN
    ALTER TABLE "User"
      ADD CONSTRAINT "User_departmentId_fkey"
      FOREIGN KEY ("departmentId") REFERENCES "Area"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "User_departmentId_idx" ON "User"("departmentId");
