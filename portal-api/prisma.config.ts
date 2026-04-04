import "dotenv/config";
import { defineConfig, env } from "prisma/config";

// Sem .env local, `prisma generate` (postinstall do npm) falhava. Runtime real usa DATABASE_URL do Railway/CI.
if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL = "postgresql://dummy:dummy@127.0.0.1:5432/dummy"
}

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    url: env("DATABASE_URL"),
  },
});
