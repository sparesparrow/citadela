import { site } from "./site";

/** Objekt se pronajímá vcelku — jedna jednotka, jeden kalendář. */
export const UNIT = "villa";
export type UnitSlug = string;

const BOOKING_BASE = "https://www.booking.com/hotel";

export interface DeepLinkOptions {
  checkin?: Date | string | null;
  checkout?: Date | string | null;
  adults?: number;
  children?: number;
  locale?: "cs" | "en";
}

function toIsoDate(value: Date | string | null | undefined): string | null {
  if (!value) return null;
  const d = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString().slice(0, 10);
}

/**
 * Sestaví deep-link na stránku objektu na Booking.com.
 * AID (affiliate ID) se připojuje ke každému odkazu, aby se zásluha
 * za rezervaci přiřadila správně — stejný princip používá i worhot.com.
 */
export function bookingUrl(opts: DeepLinkOptions = {}): string {
  const path = process.env.BOOKING_HOTEL_PATH ?? "cz/citadela";
  const url = new URL(`${BOOKING_BASE}/${path}.html`);

  const aid = process.env.BOOKING_AID;
  if (aid) url.searchParams.set("aid", aid);

  const checkin = toIsoDate(opts.checkin);
  const checkout = toIsoDate(opts.checkout);
  if (checkin) url.searchParams.set("checkin", checkin);
  if (checkout) url.searchParams.set("checkout", checkout);

  url.searchParams.set("group_adults", String(opts.adults ?? 2));
  url.searchParams.set("group_children", String(opts.children ?? 0));
  url.searchParams.set("no_rooms", "1");
  if (opts.locale) url.searchParams.set("lang", opts.locale === "cs" ? "cs" : "en-gb");

  return url.toString();
}

/** Odkaz na veřejné recenze objektu. */
export function bookingReviewsUrl(): string {
  const url = new URL(bookingUrl());
  url.searchParams.set("tab", "reviews");
  return url.toString();
}

/** Přihlášení do vlastního účtu na Booking.com (rezervace hosta). */
export const BOOKING_ACCOUNT_URL = "https://account.booking.com/sign-in";
export const BOOKING_TRIPS_URL = "https://secure.booking.com/mytrips.html";

// ---------------------------------------------------------------------------
// iCal
// ---------------------------------------------------------------------------

export interface ParsedBlock {
  roomSlug: UnitSlug;
  date: Date;
  uid: string | null;
  summary: string | null;
}

/**
 * Převede datum, jehož *místní* složky nesou zamýšlený kalendářní den,
 * na půlnoc v UTC.
 *
 * node-ical vrací hodnoty `VALUE=DATE` jako místní půlnoc (a značí je
 * příznakem `dateOnly`), kdežto `expandDates` pracuje s půlnocemi v UTC.
 * Bez tohoto převodu se v každém pásmu východně od UTC — tedy i v CET/CEST —
 * celý blok posune o den zpět: obsazenost začne o den dřív a **poslední noc
 * zůstane volná**, takže poptávkový formulář přijme termín, který se kryje
 * se skutečnou rezervací z Booking.com. Na serveru běžícím v UTC se chyba
 * neprojeví, což je přesně důvod, proč dlouho nebyla vidět.
 */
export function calendarDayToUtc(value: Date): Date {
  return new Date(Date.UTC(value.getFullYear(), value.getMonth(), value.getDate()));
}

/** Vrátí pole půlnocí (UTC) mezi start (včetně) a end (mimo). */
export function expandDates(start: Date, end: Date): Date[] {
  const out: Date[] = [];
  const cursor = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate()));
  const last = new Date(Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), end.getUTCDate()));
  // Odjezdový den se needí blokovat — pokoj je ten den opět volný.
  while (cursor < last) {
    out.push(new Date(cursor));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return out;
}

/**
 * Přečte iCal exporty z Booking.com Extranetu.
 * BOOKING_ICAL_URLS = adresy oddělené čárkou. Protože se vila pronajímá
 * vcelku, obvykle stačí jedna adresa. Zápis "slug=url" umožní držet víc
 * kalendářů zvlášť, kdyby to bylo někdy potřeba.
 */
export function icalTargets(): { roomSlug: UnitSlug; url: string }[] {
  const raw = (process.env.BOOKING_ICAL_URLS ?? "").trim();
  if (!raw) return [];

  return raw
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => {
      const eq = part.indexOf("=");
      if (eq > 0 && !part.slice(0, eq).includes("://")) {
        return { roomSlug: part.slice(0, eq).trim(), url: part.slice(eq + 1).trim() };
      }
      return { roomSlug: UNIT, url: part };
    })
    .filter((t) => t.url.startsWith("http"));
}

export async function fetchBlocks(): Promise<ParsedBlock[]> {
  const targets = icalTargets();
  if (targets.length === 0) return [];

  const ical = await import("node-ical");
  const blocks: ParsedBlock[] = [];

  for (const target of targets) {
    const events = await ical.default.async.fromURL(target.url);
    for (const value of Object.values(events)) {
      const ev = value as { type?: string; start?: Date; end?: Date; uid?: string; summary?: string };
      if (ev.type !== "VEVENT" || !ev.start || !ev.end) continue;
      // Datum z kalendáře je kalendářní den, ne okamžik — viz calendarDayToUtc.
      for (const date of expandDates(calendarDayToUtc(ev.start), calendarDayToUtc(ev.end))) {
        blocks.push({
          roomSlug: target.roomSlug,
          date,
          uid: ev.uid ?? null,
          summary: ev.summary ?? null,
        });
      }
    }
  }
  return blocks;
}

// ---------------------------------------------------------------------------
// Generování odchozího iCal kanálu
// ---------------------------------------------------------------------------

function icalDate(d: Date): string {
  return d.toISOString().slice(0, 10).replace(/-/g, "");
}

function escapeText(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\n/g, "\\n");
}

/** Zalomení řádků na 75 oktetů podle RFC 5545. */
function fold(line: string): string {
  if (line.length <= 75) return line;
  const parts: string[] = [line.slice(0, 75)];
  let rest = line.slice(75);
  while (rest.length > 74) {
    parts.push(" " + rest.slice(0, 74));
    rest = rest.slice(74);
  }
  if (rest) parts.push(" " + rest);
  return parts.join("\r\n");
}

export interface OutboundEvent {
  uid: string;
  start: Date;
  end: Date;
  summary: string;
}

/**
 * Doména v UID exportovaných událostí. Schválně konstanta, ne AUTH_URL:
 * UID musí u téže rezervace zůstat stejné napořád, jinak si ho Booking
 * napodruhé přečte jako novou událost. Kdyby se bralo z prostředí, lišilo
 * by se mezi vývojem a produkcí.
 */
const ICAL_UID_DOMAIN = "citadela-resort.cz";

export function buildIcal(events: OutboundEvent[], roomSlug?: string): string {
  const now = new Date().toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    `PRODID:-//${site.name}//Reservations//CS`,
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    fold(`X-WR-CALNAME:${escapeText(site.name)}${roomSlug ? ` — ${roomSlug}` : ""}`),
  ];

  for (const ev of events) {
    lines.push(
      "BEGIN:VEVENT",
      `UID:${ev.uid}@${ICAL_UID_DOMAIN}`,
      `DTSTAMP:${now}`,
      `DTSTART;VALUE=DATE:${icalDate(ev.start)}`,
      `DTEND;VALUE=DATE:${icalDate(ev.end)}`,
      fold(`SUMMARY:${escapeText(ev.summary)}`),
      "END:VEVENT",
    );
  }

  lines.push("END:VCALENDAR");
  return lines.join("\r\n") + "\r\n";
}
