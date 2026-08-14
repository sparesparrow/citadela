import { NextResponse } from "next/server";
import { requireAdmin } from "@/auth";
import { prisma } from "@/lib/prisma";
import { fetchBlocks, icalTargets } from "@/lib/booking";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Stáhne obsazenost z iCal exportů Booking.com.
 * Autorizace: buď platný CRON_SECRET, nebo přihlášený administrátor.
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

  if (icalTargets().length === 0) {
    return NextResponse.json({ error: "not_configured" }, { status: 400 });
  }

  const log = await prisma.syncLog.create({ data: {} });

  try {
    const blocks = await fetchBlocks();

    // Nahradíme celý snímek obsazenosti — Booking je zdroj pravdy.
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
    ]);

    await prisma.syncLog.update({
      where: { id: log.id },
      data: { ok: true, imported: blocks.length },
    });

    return NextResponse.json({ ok: true, imported: blocks.length });
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown";
    await prisma.syncLog.update({ where: { id: log.id }, data: { ok: false, message } });
    return NextResponse.json({ error: "sync_failed", message }, { status: 502 });
  }
}

export const GET = run;
export const POST = run;
