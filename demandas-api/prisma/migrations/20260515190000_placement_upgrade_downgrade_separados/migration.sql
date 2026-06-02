ALTER TABLE "PlacementCotacao"
  ADD COLUMN IF NOT EXISTS "permiteUpgrade" BOOLEAN,
  ADD COLUMN IF NOT EXISTS "regraUpgrade" TEXT,
  ADD COLUMN IF NOT EXISTS "permiteDowngrade" BOOLEAN,
  ADD COLUMN IF NOT EXISTS "regraDowngrade" TEXT;

-- Copia dados do modelo antigo (campo único), se existirem
UPDATE "PlacementCotacao"
SET
  "permiteUpgrade" = COALESCE("permiteUpgrade", "permiteUpgradeDowngrade"),
  "permiteDowngrade" = COALESCE("permiteDowngrade", "permiteUpgradeDowngrade"),
  "regraUpgrade" = COALESCE(NULLIF(TRIM("regraUpgrade"), ''), "regraUpgradeDowngrade"),
  "regraDowngrade" = COALESCE(NULLIF(TRIM("regraDowngrade"), ''), "regraUpgradeDowngrade")
WHERE "permiteUpgradeDowngrade" IS NOT NULL
   OR ("regraUpgradeDowngrade" IS NOT NULL AND TRIM("regraUpgradeDowngrade") <> '');
