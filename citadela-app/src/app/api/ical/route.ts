import { prisma } from "@/lib/prisma";
import { buildIcal, type OutboundEvent } from "@/lib/booking";
import { site } from "@/lib/site";

export const dynamic = "force-dynamic";

/**
 * Odchozí iCal kanál s potvrzenými přímými rezervacemi.
 * Adresu vložte v Booking.com Extranetu do synchronizace kalendářů,
 * aby Booking respektoval i rezervace uzavřené mimo něj.
 */
export async function GET(request: Request) {
  const room = new URL(request.url).searchParams.get("room");

  const confirmed = await prisma.inquiry.findMany({
    where: { status: "CONFIRMED", ...(room ? { roomSlug: room } : {}) },
    orderBy: { arrival: "asc" },
  });

  const events: OutboundEvent[] = confirmed.map((inq) => ({
    uid: inq.id,
    start: inq.arrival,
    end: inq.departure,
    summary: `${site.name} — ${inq.roomSlug}`,
  }));

  return new Response(buildIcal(events, room ?? undefined), {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": 'inline; filename="citadela.ics"',
      "Cache-Control": "public, max-age=300",
    },
  });
}
