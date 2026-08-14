/**
 * Ruční spuštění synchronizace z terminálu: npm run sync:booking
 * Na produkci volejte místo toho /api/cron/sync s CRON_SECRET
 * (Vercel Cron, GitHub Actions, systemd timer…).
 */
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { fetchBlocks, icalTargets } from "../src/lib/booking";

const prisma = new PrismaClient({
  adapter: new PrismaBetterSqlite3({ url: process.env.DATABASE_URL! }),
});

async function main() {
  if (icalTargets().length === 0) {
    throw new Error("BOOKING_ICAL_URLS není nastaveno.");
  }
  const blocks = await fetchBlocks();

  await prisma.$transaction([
    prisma.blockedDate.deleteMany({ where: { source: "booking.com" } }),
    prisma.blockedDate.createMany({
      data: blocks.map((b) => ({
        roomSlug: b.roomSlug,
        date: b.date,
        uid: b.uid,
        summary: b.summary,
        source: "booking.com",
      })),
    }),
    prisma.syncLog.create({ data: { ok: true, imported: blocks.length } }),
  ]);

  console.log(`Naimportováno ${blocks.length} obsazených dní.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
