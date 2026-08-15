import { NextResponse } from "next/server";
import { requireAdmin } from "@/auth";
import { prisma } from "@/lib/prisma";
import { retentionCutoff, retentionDays } from "@/lib/retention";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * Úklid dat, která nemají žít věčně.
 *
 * Dvě různé motivace, jeden běh:
 *
 *   `UsedNonce` — technický odpad. Každé přiložení karty přidá řádek a nic
 *   ho nikdy nemazalo; tabulka by rostla, dokud by zápis nezpomalil čtečky.
 *
 *   `AccessEvent` — **osobní údaj**. Je to záznam o pohybu konkrétní osoby
 *   po budově. GDPR nedovoluje držet ho déle, než je potřeba, takže se
 *   maže po `ACCESS_EVENT_RETENTION_DAYS` dnech. Tohle není údržba,
 *   ale zákonná povinnost.
 *
 * Autorizace stejná jako u synchronizace kalendáře: sdílené tajemství
 * (pro cron) nebo přihlášený administrátor.
 */

async function authorize(request: Request): Promise<boolean> {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const url = new URL(request.url);
    const provided =
      url.searchParams.get("secret") ??
      request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ??
      "";
    if (provided && provided === secret) return true;
  }
  return !!(await requireAdmin());
}

async function run(request: Request) {
  if (!(await authorize(request))) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const now = new Date();
  const days = retentionDays();
  const cutoff = retentionCutoff(now, days);

  try {
    const [nonces, events] = await prisma.$transaction([
      prisma.usedNonce.deleteMany({ where: { expiresAt: { lt: now } } }),
      prisma.accessEvent.deleteMany({ where: { at: { lt: cutoff } } }),
    ]);

    return NextResponse.json({
      ok: true,
      retentionDays: days,
      cutoff: cutoff.toISOString(),
      noncesDeleted: nonces.count,
      accessEventsDeleted: events.count,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown";
    return NextResponse.json({ error: "retention_failed", message }, { status: 500 });
  }
}

export const GET = run;
export const POST = run;
