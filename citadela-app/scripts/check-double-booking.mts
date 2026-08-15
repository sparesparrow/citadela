/**
 * Důkaz, že tentýž termín nejde prodat dvakrát.
 *
 * Scénář, který dřív procházel:
 *   1. host A pošle poptávku na termín X
 *   2. personál ji potvrdí
 *   3. host B pošle poptávku na tentýž termín X  → dřív 201, nyní 409
 *
 * Poptávky pro přípravu scény zakládáme rovnou v databázi. Veřejný
 * formulář má limit 5 odeslání za 10 minut na IP, takže kdyby přes něj
 * šlo všechno, druhý běh skriptu by narazil na limit místo na obsazenost
 * a kontrola by lhala. Přes HTTP proto posíláme jen ta dvě volání,
 * o která tu vlastně jde.
 *
 *   npx tsx scripts/check-double-booking.mts
 */

import path from "node:path";
try {
  process.loadEnvFile(path.join(process.cwd(), ".env"));
} catch {
  // spoléháme na proměnné prostředí
}

// Moduly se načítají dynamicky: `src/lib/prisma` si přečte DATABASE_URL
// hned při importu, a statické importy se vyhodnocují dřív než kód nahoře.
const { PrismaClient } = await import("../src/generated/prisma/client");
const { PrismaPg } = await import("@prisma/adapter-pg");
const { confirmInquiry, releaseInquiry, isAvailable } = await import("../src/lib/availability");
const { UNIT } = await import("../src/lib/booking");

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }),
});

const BASE = process.env.SIMULATE_BASE_URL ?? "http://localhost:3000";
const MARKER = "double-booking-check.test";

let failures = 0;
function check(name: string, ok: boolean, detail?: unknown) {
  if (ok) console.log(`  ok   ${name}`);
  else {
    failures += 1;
    console.error(`  FAIL ${name}`);
    if (detail !== undefined) console.error(`       ${JSON.stringify(detail)}`);
  }
}

/**
 * Termín daleko v budoucnu, aby nekolidoval s ostatními daty.
 *
 * Počítá se výhradně v UTC. `setDate()` totiž zachovává *místní* čas, takže
 * jakmile posun překročí hranici letního času, uletí výsledek o hodinu —
 * a pak nesedí s půlnocemi, které ukládá `expandDates`.
 */
function futureRange(offsetDays: number) {
  const now = new Date();
  const arrival = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + offsetDays),
  );
  const departure = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + offsetDays + 3),
  );
  return { arrival, departure };
}

function asIso(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/** Poptávka založená rovnou v databázi — obchází limit formuláře. */
async function seedInquiry(name: string, range: { arrival: Date; departure: Date }) {
  return prisma.inquiry.create({
    data: {
      name,
      email: `${name.toLowerCase().replace(/\s/g, ".")}@${MARKER}`,
      arrival: range.arrival,
      departure: range.departure,
      guests: 10,
      roomSlug: UNIT,
      locale: "cs",
    },
    select: { id: true },
  });
}

async function postInquiry(name: string, range: { arrival: Date; departure: Date }) {
  const response = await fetch(`${BASE}/api/inquiries`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name,
      email: `${name.toLowerCase().replace(/\s/g, ".")}@${MARKER}`,
      arrival: asIso(range.arrival),
      departure: asIso(range.departure),
      guests: 10,
      locale: "cs",
    }),
  });
  const body = await response.json().catch(() => ({}));
  if (response.status === 429) {
    console.error(
      "\nFormulář hlásí rate_limited. Limit je 5 odeslání za 10 minut na IP —\n" +
        "počkejte, nebo restartujte server (limit je v paměti procesu).",
    );
    process.exit(1);
  }
  return { status: response.status, body };
}

async function cleanup() {
  const stale = await prisma.inquiry.findMany({
    where: { email: { contains: MARKER } },
    select: { id: true },
  });
  for (const { id } of stale) {
    await prisma.blockedDate.deleteMany({ where: { uid: id } });
  }
  await prisma.inquiry.deleteMany({ where: { email: { contains: MARKER } } });
}

async function main() {
  console.log(`Kontrola dvojité rezervace proti ${BASE}\n`);
  await cleanup();

  // --- 1. potvrzená přímá rezervace zabere termín --------------------------
  console.log("Přímá rezervace zabere termín:");
  const range = futureRange(120);

  const hostA = await seedInquiry("Host A", range);
  const confirmed = await confirmInquiry(hostA.id);
  check("potvrzení uspěje", confirmed.ok === true, confirmed);
  check("potvrzením se zabraly 3 noci", confirmed.ok && confirmed.blockedDays === 3, confirmed);

  const second = await postInquiry("Host B", range);
  check(
    "druhá poptávka na stejný termín je odmítnuta (409)",
    second.status === 409 && second.body.error === "unavailable",
    second,
  );

  // --- 2. den odjezdu zůstává volný ---------------------------------------
  console.log("\nDen odjezdu zůstává volný:");
  const after = futureRange(123); // začíná dnem, kdy host A odjíždí
  const third = await postInquiry("Host C", after);
  check("příjezd v den odjezdu je možný", third.status === 201, third);

  // --- 3. souběžné potvrzení ----------------------------------------------
  console.log("\nSouběžné potvrzení téhož termínu:");
  const raceRange = futureRange(200);
  const raceA = await seedInquiry("Race A", raceRange);
  const raceB = await seedInquiry("Race B", raceRange);

  const results = await Promise.allSettled([
    confirmInquiry(raceA.id),
    confirmInquiry(raceB.id),
  ]);
  const winners = results.filter((r) => r.status === "fulfilled" && r.value.ok);
  check("potvrdí se právě jedna z nich", winners.length === 1, results);

  const blocked = await prisma.blockedDate.count({
    where: { date: { in: [raceRange.arrival] }, source: "direct" },
  });
  check("termín drží právě jedna blokace", blocked === 1, { blocked });

  // --- 4. storno termín uvolní --------------------------------------------
  console.log("\nStorno uvolní termín:");
  const winnerIndex = results.findIndex((r) => r.status === "fulfilled" && r.value.ok);
  const winnerId = winnerIndex === 0 ? raceA.id : raceB.id;

  const released = await releaseInquiry(winnerId, "DECLINED");
  check("storno uvolnilo obsazené dny", released.released === 3, released);
  check(
    "po stornu je termín zase volný",
    await isAvailable(raceRange.arrival, raceRange.departure),
  );

  // --- 5. obsazenost z Booking.com se nepřepisuje --------------------------
  console.log("\nSynchronizace nesmí smazat přímé rezervace:");
  const keepRange = futureRange(240);
  const hostE = await seedInquiry("Host E", keepRange);
  await confirmInquiry(hostE.id);

  // Simulujeme mazání, které dělá /api/cron/sync, ale v transakci, kterou
  // na konci shodíme — skript nesmí sáhnout na skutečně staženou
  // obsazenost ve vývojové databázi.
  class Rollback extends Error {}
  let survived = false;
  try {
    await prisma.$transaction(async (tx) => {
      await tx.blockedDate.deleteMany({ where: { source: "booking.com" } });
      survived = (await tx.blockedDate.count({ where: { uid: hostE.id } })) === 3;
      throw new Rollback();
    });
  } catch (error) {
    if (!(error instanceof Rollback)) throw error;
  }
  check("přímá rezervace přežije synchronizaci Booking.comu", survived);

  await cleanup();

  if (failures > 0) {
    console.error(`\n${failures} kontrol selhalo.`);
    process.exit(1);
  }
  console.log("\nVšechny kontroly prošly.");
}

main()
  .catch(async (error) => {
    console.error(error);
    await cleanup().catch(() => {});
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
