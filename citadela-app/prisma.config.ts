import path from "node:path";
import { defineConfig, env } from "prisma/config";

/**
 * Prisma 7 přesunula připojovací řetězec ze schématu sem a přestala
 * načítat .env sama — načteme ho tedy explicitně.
 * Na produkci proměnné obvykle dodá hosting, proto je chyba jen varování.
 */
try {
  process.loadEnvFile(path.join(process.cwd(), ".env"));
} catch {
  // .env neexistuje — spoléháme na proměnné prostředí.
}

export default defineConfig({
  schema: path.join("prisma", "schema.prisma"),
  datasource: {
    url: env("DATABASE_URL"),
  },
  migrations: {
    seed: "tsx prisma/seed.ts",
  },
});
