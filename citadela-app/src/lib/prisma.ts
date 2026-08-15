import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";

/**
 * Prisma 7 se připojuje přes driver adapter.
 *
 * Serverless (Vercel) drží každou instanci funkce krátce a je jich mnoho
 * současně — proto malý pool. Neon zároveň vyžaduje TLS, takže connection
 * string musí končit `?sslmode=require`; hlídá to `assertProductionUrl()`
 * níže, protože chyba by se jinak projevila až za běhu na produkci.
 */
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

function assertProductionUrl(url: string): void {
  if (process.env.NODE_ENV !== "production") return;
  if (url.startsWith("file:")) {
    throw new Error(
      "DATABASE_URL ukazuje na SQLite. Produkce potřebuje Postgres — " +
        "zkontrolujte proměnné prostředí na hostingu.",
    );
  }
  // Lokální databáze (CI, build v kontejneru) TLS nepotřebuje a vyžadovat ho
  // po ní by shodilo `next build`, který stránky předrenderuje v produkčním
  // režimu. Vzdálené spojení je jiná věc — tam heslo poteče po síti.
  const host = new URL(url).hostname;
  const isLocal = host === "localhost" || host === "127.0.0.1" || host === "::1";
  if (!isLocal && !/sslmode=/.test(url)) {
    throw new Error("DATABASE_URL nemá sslmode — Neon vyžaduje `?sslmode=require`.");
  }
}

function createClient(): PrismaClient {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("Chybí DATABASE_URL — zkopírujte .env.example do .env.");
  assertProductionUrl(url);

  const adapter = new PrismaPg({
    connectionString: url,
    // Víc než pár spojení na instanci nemá smysl: limit drží Neon, ne my.
    max: process.env.NODE_ENV === "production" ? 3 : 10,
  });

  return new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });
}

export const prisma = globalForPrisma.prisma ?? createClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
