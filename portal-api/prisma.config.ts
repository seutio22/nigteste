import "dotenv/config";
import { defineConfig, env } from "prisma/config";

/**
 * Prisma 6+ com `prisma.config.ts`: o CLI pode mostrar «skipping environment variable loading» —
 * é normal; o URL vem de `env("DATABASE_URL")` e, em dev, de `import "dotenv/config"`.
 * No Docker/Railway, `DATABASE_URL` é injetada no ambiente antes de `prisma generate`.
 *
 * Sem .env local, `prisma generate` (postinstall) precisa do fallback abaixo; em produção usa-se a URL real.
 */
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
