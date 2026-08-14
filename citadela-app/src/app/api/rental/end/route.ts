import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { priceRental } from "@/lib/access";
import { authenticateReader } from "@/lib/reader-request";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Ukonceni vypujcky. Dok hlasi, ze kolobezka je zpatky v stojanu.
 *
 * Uzavreni sezeni, uvolneni kolobezky a zapis polozky na ucet musi
 * probehnout dohromady, jinak by slo skoncit s vypujckou, kterou nikdo
 * nezaplati, nebo s kolobezkou, kterou uz nikdo nepujci.
 */

const schema = z.object({
  rentalSessionId: z.string().trim().min(1).max(64),
  batteryPct: z.coerce.number().int().min(0).max(100).optional(),
});

export async function POST(request: Request) {
  const authed = await authenticateReader(request);
  if (!authed.ok) {
    return NextResponse.json({ ok: false, reason: authed.reason }, { status: authed.status });
  }

  if (authed.accessPoint.kind !== "SCOOTER_DOCK") {
    return NextResponse.json({ ok: false, reason: "wrong_access_point_kind" }, { status: 400 });
  }

  let payload: unknown;
  try {
    payload = JSON.parse(authed.rawBody);
  } catch {
    return NextResponse.json({ error: "invalid" }, { status: 400 });
  }

  const parsed = schema.safeParse(payload);
  if (!parsed.success) return NextResponse.json({ error: "invalid" }, { status: 400 });
  const data = parsed.data;

  const session = await prisma.rentalSession.findUnique({
    where: { id: data.rentalSessionId },
    include: {
      scooter: true,
      stayGuest: { select: { stayId: true, name: true } },
    },
  });

  if (!session) return NextResponse.json({ ok: false, reason: "session_unknown" }, { status: 404 });

  // Opakovane hlaseni od doku je bezna vec (vypadek site, retry).
  // Odpovime uspechem, ale nic znovu neuctujeme.
  if (session.status !== "OPEN") {
    return NextResponse.json({ ok: true, reason: "already_closed", rentalSessionId: session.id });
  }

  const endedAt = new Date();
  const amountCents = priceRental(session.startedAt, endedAt, {
    baseFeeCents: session.scooter.baseFeeCents,
    perMinuteCents: session.scooter.perMinuteCents,
  });

  const minutes = Math.max(
    1,
    Math.ceil((endedAt.getTime() - session.startedAt.getTime()) / 60_000),
  );

  await prisma.$transaction([
    prisma.rentalSession.update({
      where: { id: session.id },
      data: { status: "CLOSED", endedAt },
    }),
    prisma.scooter.update({
      where: { id: session.scooterId },
      data: {
        status: "AVAILABLE",
        dockId: authed.accessPoint.id,
        ...(data.batteryPct !== undefined ? { batteryPct: data.batteryPct } : {}),
      },
    }),
    prisma.folioItem.create({
      data: {
        stayId: session.stayGuest.stayId,
        kind: "SCOOTER_RENTAL",
        description: `Kolobezka ${session.scooter.code} — ${minutes} min`,
        amountCents,
        rentalSessionId: session.id,
      },
    }),
  ]);

  return NextResponse.json({
    ok: true,
    rentalSessionId: session.id,
    minutes,
    amountCents,
  });
}
