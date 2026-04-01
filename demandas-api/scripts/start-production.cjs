/**
 * Inicia a API após tentar prisma migrate deploy.
 * Se o banco nunca teve baseline (P3005), o deploy de migrate falha em loop no Railway;
 * aqui ignoramos só P3005 e subimos o servidor para você rodar baseline manualmente.
 */
const { spawnSync, spawn } = require("child_process");
const path = require("path");

const root = path.resolve(__dirname, "..");

const migrate = spawnSync(
  process.platform === "win32" ? "npx.cmd" : "npx",
  ["prisma", "migrate", "deploy"],
  { cwd: root, encoding: "utf-8", env: process.env }
);

const out = `${migrate.stdout || ""}${migrate.stderr || ""}`;

if (migrate.status !== 0) {
  if (out.includes("P3005")) {
    console.warn(
      "[start-production] prisma migrate deploy: P3005 (banco sem histórico de migrations). " +
        "Subindo servidor mesmo assim. Rode uma vez: node scripts/baseline-existing-db.js com DATABASE_URL do Railway."
    );
  } else {
    console.error(out);
    process.exit(migrate.status || 1);
  }
}

const node = spawn("node", ["dist/server.js"], {
  cwd: root,
  stdio: "inherit",
  env: process.env,
});
node.on("exit", (code, signal) => {
  if (signal) process.kill(process.pid, signal);
  process.exit(code ?? 1);
});
