import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { site } from "@/lib/site";
import { isAvailable } from "@/lib/availability";
import { UNIT } from "@/lib/booking";

const schema = z.object({
  name: z.string().trim().min(2).max(120),
  email: z.string().trim().email().max(200),
  phone: z.string().trim().max(40).nullish(),
  arrival: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  departure: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  guests: z.coerce.number().int().min(1).max(60),
  message: z.string().trim().max(2000).nullish(),
  locale: z.enum(["cs", "en"]).default("cs"),
  // Honeypot — roboti vyplní i skryté pole, lidé ne.
  website: z.string().max(0).optional(),
});

/** Jednoduchý in-memory limit. V produkci nahraďte Redisem / Upstash. */
const hits = new Map<string, { count: number; resetAt: number }>();
const WINDOW_MS = 10 * 60 * 1000;
const MAX_PER_WINDOW = 5;

function rateLimited(key: string): boolean {
  const now = Date.now();
  const entry = hits.get(key);
  if (!entry || entry.resetAt < now) {
    hits.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return false;
  }
  entry.count += 1;
  return entry.count > MAX_PER_WINDOW;
}

export async function POST(request: Request) {
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    request.headers.get("x-real-ip") ??
    "unknown";

  if (rateLimited(ip)) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid" }, { status: 400 });
  }

  const parsed = schema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid" }, { status: 400 });
  }
  const data = parsed.data;

  const arrival = new Date(`${data.arrival}T00:00:00.000Z`);
  const departure = new Date(`${data.departure}T00:00:00.000Z`);
  if (departure <= arrival) {
    return NextResponse.json({ error: "invalid_dates" }, { status: 400 });
  }

  // Vila se pronajímá vcelku, hlídáme tedy kapacitu objektu.
  if (data.guests > site.maxGuests) {
    return NextResponse.json({ error: "too_many_guests" }, { status: 422 });
  }

  // Kolize s obsazeností — z Booking.comu i z našich potvrzených rezervací.
  // Dřív se hlídal jen Booking.com, takže se dal tentýž termín prodat
  // podruhé; viz src/lib/availability.ts.
  if (!(await isAvailable(arrival, departure))) {
    return NextResponse.json({ error: "unavailable" }, { status: 409 });
  }

  const session = await auth();

  const inquiry = await prisma.inquiry.create({
    data: {
      name: data.name,
      email: data.email.toLowerCase(),
      phone: data.phone ?? null,
      arrival,
      departure,
      guests: data.guests,
      roomSlug: UNIT,
      message: data.message ?? null,
      locale: data.locale,
      userId: session?.user?.id ?? null,
    },
    select: { id: true },
  });

  // TODO: odeslat potvrzovací e-mail hostovi i concierge (Resend / SendGrid).
  return NextResponse.json({ ok: true, id: inquiry.id }, { status: 201 });
}
