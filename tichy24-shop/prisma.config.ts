import path from "node:path";
import { defineConfig, env } from "prisma/config";

/**
 * Prisma 7 presunula pripojovaci retezec ze schematu sem a prestala
 * nacitat .env sama — nacteme ho tedy explicitne. Na produkci promenne
 * obvykle dodava hosting, proto je chyba jen ticha.
 */
try {
  process.loadEnvFile(path.join(process.cwd(), ".env"));
} catch {
  // .env neexistuje — spolehame na promenne prostredi.
}

/**
 * Migrace potrebuji prime spojeni, ne pooler (Neon `-pooler` bezi pres
 * PgBouncer v transakcnim rezimu a `migrate deploy` v nem neprojde).
 * Bezici aplikace se pripojuje adapterem v src/lib/prisma.ts.
 */
const migrationUrl = process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL;

export default defineConfig({
  schema: path.join("prisma", "schema.prisma"),
  datasource: {
    url: migrationUrl ?? env("DATABASE_URL"),
  },
  migrations: {
    seed: "tsx prisma/seed.ts",
  },
});
