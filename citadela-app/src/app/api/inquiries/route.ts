import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { site, segments, rentals, houseModeFor } from "@/lib/site";
import { isAvailable } from "@/lib/availability";
import { UNIT } from "@/lib/booking";
import { nightsBetween } from "@/lib/quote";
import { sendMail } from "@/lib/mail";

/** Segment poptávky — číselník ze site.ts plus „nic z toho“. */
const segmentValues = [...segments, "other"] as const;

const schema = z.object({
  name: z.string().trim().min(2).max(120),
  email: z.string().trim().email().max(200),
  phone: z.string().trim().max(40).nullish(),
  arrival: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  departure: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  guests: z.coerce.number().int().min(1).max(60),
  segment: z.enum(segmentValues).default("other"),
  companyName: z.string().trim().max(200).nullish(),
  // IČO a DIČ přijímáme, jak je host napíše — formáty se liší stát od státu
  // a odmítnout firemní poptávku kvůli mezeře v DIČ by bylo dražší než opsat ji ručně.
  companyId: z.string().trim().max(20).nullish(),
  vatId: z.string().trim().max(20).nullish(),
  // Zájem o půjčovnu; duplicity odstraníme, ať se nezapisují dvakrát.
  rentalInterest: z.array(z.enum(rentals)).max(rentals.length * 2).default([]),
  supervisorCount: z.coerce.number().int().min(0).max(60).nullish(),
  message: z.string().trim().max(2000).nullish(),
  locale: z.enum(["cs", "en"]).default("cs"),
  // Honeypot — roboti vyplní i skryté pole, lidé ne.
  website: z.string().max(0).optional(),
});

type InquiryPayload = z.infer<typeof schema>;

/** Předmět nese segment, ať jde firemní poptávka poznat ve schránce na první pohled. */
function inquiryNotificationSubject(segment: InquiryPayload["segment"], name: string): string {
  return `Poptávka (${segment}): ${name}`;
}

/**
 * Interní upozornění pro provoz — prostý text, protože se čte na telefonu
 * a jediné, co má udělat, je dát dost údajů pro odpověď bez otevírání správy.
 */
function inquiryNotificationBody(
  input: InquiryPayload & { id: string; nights: number },
): string {
  const lines = [
    `Segment: ${input.segment} (režim: ${houseModeFor(input.segment)})`,
    `Termín: ${input.arrival} → ${input.departure} (${input.nights} nocí)`,
    `Osob: ${input.guests}`,
  ];

  if (houseModeFor(input.segment) === "supervised") {
    lines.push(`Dozor: ${input.supervisorCount ?? "neuveden"}`);
  }
  if (input.companyName) {
    lines.push(`Firma: ${input.companyName} (IČO ${input.companyId ?? "—"}, DIČ ${input.vatId ?? "—"})`);
  }
  if (input.rentalInterest.length > 0) {
    lines.push(`Půjčovna: ${[...new Set(input.rentalInterest)].join(", ")}`);
  }

  lines.push("", `Kontakt: ${input.name} · ${input.email}${input.phone ? ` · ${input.phone}` : ""}`);
  if (input.message) lines.push("", input.message);
  lines.push("", `ID poptávky: ${input.id}`);

  return lines.join("\n");
}

/** Jednoduchý in-memory limit. V produkci nahraďte Redisem / Upstash. */
const hits = new Map<string, { count: number; resetAt: number }>();
const WINDOW_MS = 10 * 60 * 1000;

/**
 * Kolik poptávek z jedné adresy za okno. Pět stačí člověku i s překlepy,
 * ale e2e sada odešle víc — proto se dá zvednout z prostředí. Výchozí
 * hodnota platí všude, kde se proměnná nenastaví, tedy i na produkci.
 */
function maxPerWindow(): number {
  const configured = Number(process.env.INQUIRY_RATE_LIMIT_MAX);
  return Number.isFinite(configured) && configured > 0 ? configured : 5;
}

function rateLimited(key: string): boolean {
  const now = Date.now();
  const entry = hits.get(key);
  if (!entry || entry.resetAt < now) {
    hits.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return false;
  }
  entry.count += 1;
  return entry.count > maxPerWindow();
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
      segment: data.segment,
      companyName: data.companyName || null,
      companyId: data.companyId || null,
      vatId: data.vatId || null,
      rentalInterest: [...new Set(data.rentalInterest)],
      // Dozor dává smysl jen v režimu s dozorem; režim si odvodíme ze segmentu
      // znovu na serveru, ať se do sloupce nedostane číslo od firemního pobytu.
      supervisorCount:
        houseModeFor(data.segment) === "supervised" ? (data.supervisorCount ?? null) : null,
      message: data.message ?? null,
      locale: data.locale,
      userId: session?.user?.id ?? null,
    },
    select: { id: true },
  });

  // Web slibuje firemní nabídku do groupPricing.quoteWithinHours hodin —
  // a ten slib drží jen tehdy, když se o poptávce někdo doví hned.
  // Poptávka je v tuhle chvíli uložená; odeslání ji proto nesmí shodit,
  // sendMail() z principu nevyhazuje a při chybě jen loguje.
  await sendMail({
    to: process.env.INQUIRY_NOTIFY_TO ?? site.email,
    subject: inquiryNotificationSubject(data.segment, data.name),
    text: inquiryNotificationBody({
      ...data,
      id: inquiry.id,
      nights: nightsBetween(arrival, departure),
    }),
    replyTo: data.email,
  });

  // TODO: potvrzovací e-mail hostovi (jinou šablonou než tenhle interní).
  return NextResponse.json({ ok: true, id: inquiry.id }, { status: 201 });
}
