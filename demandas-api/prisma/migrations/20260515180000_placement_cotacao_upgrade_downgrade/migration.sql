ALTER TABLE "PlacementCotacao"
  ADD COLUMN IF NOT EXISTS "permiteUpgradeDowngrade" BOOLEAN,
  ADD COLUMN IF NOT EXISTS "regraUpgradeDowngrade" TEXT;
