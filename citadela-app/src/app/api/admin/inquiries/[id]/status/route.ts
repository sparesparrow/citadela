import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/auth";
import { confirmInquiry, releaseInquiry } from "@/lib/availability";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Změna stavu poptávky. Jediná cesta, jak potvrdit rezervaci.
 *
 * Potvrzení není jen změna sloupce — zabírá termín v kalendáři, aby ho
 * nešlo prodat podruhé. Proto celá logika žije v `src/lib/availability.ts`
 * a tahle route jen ověří oprávnění a přeloží výsledek na stavový kód.
 */

const schema = z.object({
  status: z.enum(["NEW", "CONTACTED", "CONFIRMED", "DECLINED"]),
});

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid" }, { status: 400 });
  }

  const parsed = schema.safeParse(payload);
  if (!parsed.success) return NextResponse.json({ error: "invalid" }, { status: 400 });

  const { status } = parsed.data;

  if (status === "CONFIRMED") {
    const result = await confirmInquiry(id);
    if (!result.ok) {
      // Obsazeno je 409, aby se to nepletlo s chybou vstupu.
      const code = result.reason === "not_found" ? 404 : 409;
      return NextResponse.json({ error: result.reason }, { status: code });
    }
    return NextResponse.json({ ok: true, status, blockedDays: result.blockedDays });
  }

  const exists = await prisma.inquiry.findUnique({ where: { id }, select: { status: true } });
  if (!exists) return NextResponse.json({ error: "not_found" }, { status: 404 });

  // Odvolání potvrzení musí termín zase uvolnit, jinak by zůstal zabraný
  // rezervací, která už neplatí.
  if (exists.status === "CONFIRMED") {
    const { released } = await releaseInquiry(id, status === "DECLINED" ? "DECLINED" : "NEW");
    return NextResponse.json({ ok: true, status, releasedDays: released });
  }

  await prisma.inquiry.update({ where: { id }, data: { status } });
  return NextResponse.json({ ok: true, status });
}
