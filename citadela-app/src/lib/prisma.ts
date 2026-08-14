import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient } from "@/generated/prisma/client";

/**
 * Prisma 7 se připojuje přes driver adapter.
 * Přechod na Postgres: nahraďte adaptér za @prisma/adapter-pg
 *   import { PrismaPg } from "@prisma/adapter-pg";
 *   const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
 * a v prisma/schema.prisma změňte provider na "postgresql".
 */
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

function createClient(): PrismaClient {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("Chybí DATABASE_URL — zkopírujte .env.example do .env.");

  const adapter = new PrismaBetterSqlite3({ url });

  return new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });
}

export const prisma = globalForPrisma.prisma ?? createClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
