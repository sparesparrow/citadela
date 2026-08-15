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

/**
 * Migrace potřebují přímé spojení, ne pooler. Neon pouští `-pooler` endpoint
 * přes PgBouncer v transakčním režimu, kde neprojdou příkazy držící stav
 * napříč transakcemi — a `migrate deploy` přesně takové posílá (advisory
 * zámek, aby dvě nasazení nemigrovala současně).
 *
 * Tenhle soubor čte jen Prisma CLI; běžící aplikace se připojuje adaptérem
 * v src/lib/prisma.ts, a ta naopak pooler chce. Proto se cesty rozcházejí.
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
