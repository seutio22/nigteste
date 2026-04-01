/**
 * Uso (uma vez, com URL do Postgres do Railway):
 *   cd demandas-api
 *   PowerShell: $env:DATABASE_URL = "postgresql://..."
 *   node scripts/baseline-existing-db.js
 *
 * Garante coluna TipoDemanda.ativo e marca as 11 migrations como aplicadas
 * (baseline para banco que já tinha schema sem _prisma_migrations).
 */
const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");

const MIGRATIONS_IN_ORDER = [
  "20241030022000_rename_qtdClientesVinculados_to_total",
  "20250101000000_add_performance_indexes",
  "20251008000000_remove_ticket_unique_constraint_from_demanda",
  "20251008000001_create_grupo_table",
  "20251030150000_add_project_privacy",
  "20251104202348_add_performance_indexes",
  "20260114134415_remove_contrato_numero_unique",
  "20260127000000_add_project_alerts",
  "20260127100000_add_alert_task_subtask",
  "20260127200000_alert_unique_add_diasantes",
  "20260331120000_tipo_demanda_ativo",
];

const sqlAtivo =
  'ALTER TABLE "TipoDemanda" ADD COLUMN IF NOT EXISTS "ativo" BOOLEAN NOT NULL DEFAULT true;';

const publicUrl =
  process.env.DATABASE_PUBLIC_URL?.trim() ||
  process.env.database_public_url?.trim();
if (!process.env.DATABASE_URL?.trim() && publicUrl) {
  process.env.DATABASE_URL = publicUrl;
}

if (!process.env.DATABASE_URL?.trim()) {
  console.error(
    "Defina DATABASE_URL ou DATABASE_PUBLIC_URL (connection string do PostgreSQL no Railway)."
  );
  process.exit(1);
}

function run(cmd) {
  execSync(cmd, { cwd: root, stdio: "inherit", env: process.env });
}

console.log("1/2 Coluna TipoDemanda.ativo (idempotente)...");
const sqlFile = path.join(root, ".baseline-ativo-temp.sql");
try {
  fs.writeFileSync(sqlFile, sqlAtivo, "utf8");
  run(
    `npx prisma db execute --schema prisma/schema.prisma --file "${sqlFile.replace(/\\/g, "/")}"`
  );
} finally {
  try {
    fs.unlinkSync(sqlFile);
  } catch {
    /* ignore */
  }
}

console.log("2/2 Baseline: migrate resolve --applied (11 migrations)...");
for (const name of MIGRATIONS_IN_ORDER) {
  console.log(`  → ${name}`);
  run(`npx prisma migrate resolve --applied "${name}"`);
}

console.log("\nConcluído. Redeploy da API pode voltar a usar: prisma migrate deploy && node dist/server.js");
