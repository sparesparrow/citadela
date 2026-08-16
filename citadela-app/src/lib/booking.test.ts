import { afterEach, describe, expect, it, vi } from "vitest";
import {
  UNIT,
  bookingHotelId,
  bookingReviewsUrl,
  bookingUrl,
  buildIcal,
  calendarDayToUtc,
  expandDates,
  icalTargets,
  type OutboundEvent,
} from "./booking";

/**
 * Testy napojeni na Booking.com.
 *
 * Nejdulezitejsi je `expandDates`: kdyby zablokoval i den odjezdu, vila by
 * vypadala obsazene o den dele, nez skutecne je. Opacna chyba je jeste horsi —
 * dvojita rezervace. Proto je hranice okna otestovana z obou stran.
 */

afterEach(() => {
  vi.unstubAllEnvs();
});

// ---------------------------------------------------------------------------
// expandDates
// ---------------------------------------------------------------------------

function iso(d: Date): string {
  return d.toISOString().slice(0, 10);
}

describe("expandDates", () => {
  it("den odjezdu uz neblokuje — pokoj je ten den volny", () => {
    const days = expandDates(new Date("2026-08-10"), new Date("2026-08-13"));
    expect(days.map(iso)).toEqual(["2026-08-10", "2026-08-11", "2026-08-12"]);
  });

  it("jednonocni pobyt zabere jediny den", () => {
    const days = expandDates(new Date("2026-08-10"), new Date("2026-08-11"));
    expect(days.map(iso)).toEqual(["2026-08-10"]);
  });

  it("stejny den zacatku i konce nezabere nic", () => {
    expect(expandDates(new Date("2026-08-10"), new Date("2026-08-10"))).toEqual([]);
  });

  it("prechod pres konec mesice sedi", () => {
    const days = expandDates(new Date("2026-08-30"), new Date("2026-09-02"));
    expect(days.map(iso)).toEqual(["2026-08-30", "2026-08-31", "2026-09-01"]);
  });

  it("prechod pres prestupny rok sedi", () => {
    const days = expandDates(new Date("2028-02-28"), new Date("2028-03-01"));
    expect(days.map(iso)).toEqual(["2028-02-28", "2028-02-29"]);
  });

  it("vraci pulnoci v UTC, ne v mistnim case", () => {
    const [first] = expandDates(new Date("2026-08-10"), new Date("2026-08-11"));
    expect(first.getUTCHours()).toBe(0);
    expect(first.getUTCMinutes()).toBe(0);
    expect(first.getUTCSeconds()).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// bookingUrl
// ---------------------------------------------------------------------------

describe("bookingUrl", () => {
  it("bez BOOKING_AID se affiliate parametr nepripoji", () => {
    vi.stubEnv("BOOKING_AID", "");
    const url = new URL(bookingUrl());
    expect(url.searchParams.has("aid")).toBe(false);
  });

  it("s BOOKING_AID se pripoji ke kazdemu odkazu", () => {
    vi.stubEnv("BOOKING_AID", "1234567");
    const url = new URL(bookingUrl());
    expect(url.searchParams.get("aid")).toBe("1234567");
  });

  it("bez slugu miri odkaz na ID objektu", () => {
    vi.stubEnv("BOOKING_HOTEL_PATH", "");
    const url = new URL(bookingUrl());
    expect(url.pathname).toBe("/searchresults.html");
    expect(url.searchParams.get("dest_id")).toBe(bookingHotelId());
    expect(url.searchParams.get("dest_type")).toBe("hotel");
  });

  it("ID objektu jde prepsat z prostredi", () => {
    vi.stubEnv("BOOKING_HOTEL_PATH", "");
    vi.stubEnv("BOOKING_HOTEL_ID", "999");
    expect(new URL(bookingUrl()).searchParams.get("dest_id")).toBe("999");
  });

  it("respektuje BOOKING_HOTEL_PATH", () => {
    vi.stubEnv("BOOKING_HOTEL_PATH", "cz/jiny-objekt");
    const url = new URL(bookingUrl());
    expect(url.toString()).toContain("/hotel/cz/jiny-objekt.html");
    // Na strance objektu uz ID neni k cemu — slug sam o sobe staci.
    expect(url.searchParams.has("dest_id")).toBe(false);
  });

  it("data prevede na YYYY-MM-DD", () => {
    const url = new URL(
      bookingUrl({ checkin: new Date("2026-08-10"), checkout: "2026-08-13" }),
    );
    expect(url.searchParams.get("checkin")).toBe("2026-08-10");
    expect(url.searchParams.get("checkout")).toBe("2026-08-13");
  });

  it("neplatne datum se do odkazu nedostane", () => {
    const url = new URL(bookingUrl({ checkin: "nesmysl" }));
    expect(url.searchParams.has("checkin")).toBe(false);
  });

  it("vychozi obsazenost je 2 dospeli, 0 deti, 1 pokoj", () => {
    const url = new URL(bookingUrl());
    expect(url.searchParams.get("group_adults")).toBe("2");
    expect(url.searchParams.get("group_children")).toBe("0");
    expect(url.searchParams.get("no_rooms")).toBe("1");
  });

  it("jazyk se mapuje na kod, ktery Booking zna", () => {
    expect(new URL(bookingUrl({ locale: "cs" })).searchParams.get("lang")).toBe("cs");
    expect(new URL(bookingUrl({ locale: "en" })).searchParams.get("lang")).toBe("en-gb");
  });

  it("odkaz na recenze si nese stejne parametry a pridava zalozku", () => {
    vi.stubEnv("BOOKING_AID", "1234567");
    const url = new URL(bookingReviewsUrl());
    expect(url.searchParams.get("tab")).toBe("reviews");
    expect(url.searchParams.get("aid")).toBe("1234567");
  });
});

// ---------------------------------------------------------------------------
// icalTargets
// ---------------------------------------------------------------------------

describe("icalTargets", () => {
  it("prazdna promenna neznamena zadny cil", () => {
    vi.stubEnv("BOOKING_ICAL_URLS", "");
    expect(icalTargets()).toEqual([]);
  });

  it("holou adresu priradi cele vile", () => {
    vi.stubEnv("BOOKING_ICAL_URLS", "https://ical.booking.com/a.ics");
    expect(icalTargets()).toEqual([{ roomSlug: UNIT, url: "https://ical.booking.com/a.ics" }]);
  });

  it("adresy oddelene carkou rozdeli a orizne mezery", () => {
    vi.stubEnv(
      "BOOKING_ICAL_URLS",
      " https://ical.booking.com/a.ics , https://ical.booking.com/b.ics ",
    );
    expect(icalTargets().map((t) => t.url)).toEqual([
      "https://ical.booking.com/a.ics",
      "https://ical.booking.com/b.ics",
    ]);
  });

  it("zapis slug=url drzi kalendare zvlast", () => {
    vi.stubEnv("BOOKING_ICAL_URLS", "tower=https://ical.booking.com/a.ics");
    expect(icalTargets()).toEqual([
      { roomSlug: "tower", url: "https://ical.booking.com/a.ics" },
    ]);
  });

  it("dvojtecka v https:// se nesplete se zapisem slug=url", () => {
    vi.stubEnv("BOOKING_ICAL_URLS", "https://ical.booking.com/a.ics?x=1");
    expect(icalTargets()[0].roomSlug).toBe(UNIT);
  });

  it("co neni http adresa, se zahodi", () => {
    vi.stubEnv("BOOKING_ICAL_URLS", "nesmysl,ftp://x.ics,https://ical.booking.com/a.ics");
    expect(icalTargets()).toHaveLength(1);
  });
});

// ---------------------------------------------------------------------------
// buildIcal
// ---------------------------------------------------------------------------

const sampleEvent: OutboundEvent = {
  uid: "inq-1",
  start: new Date("2026-08-10"),
  end: new Date("2026-08-13"),
  summary: "Přímá rezervace",
};

describe("buildIcal", () => {
  it("vyrobi platnou obalku kalendare", () => {
    const ics = buildIcal([sampleEvent]);
    expect(ics.startsWith("BEGIN:VCALENDAR")).toBe(true);
    expect(ics.trimEnd().endsWith("END:VCALENDAR")).toBe(true);
    expect(ics).toContain("VERSION:2.0");
  });

  it("radky odděluje CRLF podle RFC 5545", () => {
    const ics = buildIcal([sampleEvent]);
    // Zadny osamoceny LF — kazdy konec radku musi mit pred sebou CR.
    expect(/[^\r]\n/.test(ics)).toBe(false);
  });

  it("data zapisuje jako VALUE=DATE bez casu", () => {
    const ics = buildIcal([sampleEvent]);
    expect(ics).toContain("DTSTART;VALUE=DATE:20260810");
    expect(ics).toContain("DTEND;VALUE=DATE:20260813");
  });

  it("UID doplni domenou, aby byl globalne jednoznacny", () => {
    expect(buildIcal([sampleEvent])).toContain("UID:inq-1@citadela-resort.cz");
  });

  it("carky a strednik v popisu escapuje", () => {
    const ics = buildIcal([{ ...sampleEvent, summary: "Novák, Petr; VIP" }]);
    expect(ics).toContain("Novák\\, Petr\\; VIP");
  });

  it("dlouhy radek zalomi na 75 oktetu s mezerou na zacatku pokracovani", () => {
    const ics = buildIcal([{ ...sampleEvent, summary: "A".repeat(200) }]);
    const lines = ics.split("\r\n");
    expect(lines.every((line) => line.length <= 75)).toBe(true);
    // Pokracovaci radek musi zacinat mezerou, jinak ho ctecka nespoji.
    const summaryIndex = lines.findIndex((l) => l.startsWith("SUMMARY:"));
    expect(lines[summaryIndex + 1].startsWith(" ")).toBe(true);
  });

  it("zvladne vic udalosti najednou", () => {
    const ics = buildIcal([sampleEvent, { ...sampleEvent, uid: "inq-2" }]);
    expect(ics.match(/BEGIN:VEVENT/g)).toHaveLength(2);
  });

  it("prazdny seznam vyrobi prazdny, ale platny kalendar", () => {
    const ics = buildIcal([]);
    expect(ics).toContain("BEGIN:VCALENDAR");
    expect(ics).not.toContain("BEGIN:VEVENT");
  });

  it("nazev kalendare rozliší jednotku, pokud je zadana", () => {
    expect(buildIcal([sampleEvent], "villa")).toContain("villa");
  });

  /**
   * Nejdulezitejsi test celeho souboru: co vyrobime, musi jit precist zpatky.
   * Pouzivame stejnou knihovnu (node-ical), jakou ctem prichozi kalendare —
   * kdyby se rozesla nase generace s nasim parserem, poznamu to tady.
   */
  it("kolecko tam a zpet: vygenerovany kalendar jde znovu precist", async () => {
    const ical = await import("node-ical");
    const parsed = ical.default.sync.parseICS(buildIcal([sampleEvent]));

    const events = Object.values(parsed).filter(
      (v) => (v as { type?: string }).type === "VEVENT",
    ) as { start: Date; end: Date; summary: string; uid: string }[];

    expect(events).toHaveLength(1);
    expect(iso(calendarDayToUtc(events[0].start))).toBe("2026-08-10");
    expect(iso(calendarDayToUtc(events[0].end))).toBe("2026-08-13");
    expect(events[0].summary).toBe("Přímá rezervace");
  });

  it("kolecko tam a zpet zachova i den odjezdu jako konec pobytu", async () => {
    const ical = await import("node-ical");
    const parsed = ical.default.sync.parseICS(buildIcal([sampleEvent]));
    const event = Object.values(parsed).find(
      (v) => (v as { type?: string }).type === "VEVENT",
    ) as { start: Date; end: Date };

    // Presne to, co dela fetchBlocks. Rozbaleni musi dat stejne tri noci,
    // se kterymi jsme zacali.
    const days = expandDates(calendarDayToUtc(event.start), calendarDayToUtc(event.end));
    expect(days.map(iso)).toEqual(["2026-08-10", "2026-08-11", "2026-08-12"]);
  });
});

// ---------------------------------------------------------------------------
// calendarDayToUtc — regrese na posun o den
// ---------------------------------------------------------------------------

describe("calendarDayToUtc", () => {
  it("mistni pulnoc prevede na tyz kalendarni den v UTC", () => {
    // Presne to, co vraci node-ical pro VALUE=DATE:20260810 v pasmu UTC+2.
    const localMidnight = new Date(2026, 7, 10, 0, 0, 0);
    expect(iso(calendarDayToUtc(localMidnight))).toBe("2026-08-10");
  });

  it("bez prevodu by se blok posunul o den zpet ve vsech pasmech vychodne od UTC", () => {
    const localMidnight = new Date(2026, 7, 10, 0, 0, 0);
    const shifted = localMidnight.getTimezoneOffset() < 0;
    // Test musi platit i na serveru v UTC, kde k posunu nedochazi.
    if (shifted) {
      expect(iso(localMidnight)).not.toBe("2026-08-10");
    }
    expect(iso(calendarDayToUtc(localMidnight))).toBe("2026-08-10");
  });

  it("posledni noc zustane zablokovana — zadna dvojita rezervace", () => {
    const start = new Date(2026, 7, 10, 0, 0, 0);
    const end = new Date(2026, 7, 13, 0, 0, 0);
    const days = expandDates(calendarDayToUtc(start), calendarDayToUtc(end)).map(iso);
    expect(days).toContain("2026-08-12");
    expect(days).not.toContain("2026-08-13");
  });
});
