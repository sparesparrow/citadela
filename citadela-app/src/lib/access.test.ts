import { describe, expect, it } from "vitest";
import {
  decideAccess,
  priceRental,
  stayWindow,
  type AuthorizeInput,
} from "./access";

/**
 * Testy rozhodovaci logiky. Zadna databaze, zadne HTTP — jen pravidla.
 * Zajimaji nas hlavne zamitnuti: ta jsou to, co drzi dvere zavrene.
 */

const ARRIVAL = new Date("2026-08-10T00:00:00");
const DEPARTURE = new Date("2026-08-15T00:00:00");

/** Poledne uprostred pobytu — bezpecne uvnitr okna. */
const DURING = new Date("2026-08-12T12:00:00");

/**
 * Recepce vydava kartu s malou rezervou za check-out, aby o platnosti
 * karty rozhodovalo okno pobytu, ne nahodne useknuti o pulnoci.
 */
const CARD_VALID_TO = new Date("2026-08-15T23:59:00");

function input(overrides: Partial<AuthorizeInput> = {}): AuthorizeInput {
  return {
    now: DURING,
    accessPoint: { kind: "DOOR", enabled: true, bedroomSlug: "gold", isCommon: false },
    credential: {
      status: "ACTIVE",
      validFrom: ARRIVAL,
      validTo: CARD_VALID_TO,
    },
    stay: { status: "CHECKED_IN", arrival: ARRIVAL, departure: DEPARTURE },
    guest: { bedroomSlug: "gold" },
    ...overrides,
  };
}

describe("decideAccess — dvere", () => {
  it("pusti hosta do jeho pokoje", () => {
    expect(decideAccess(input())).toEqual({ allowed: true, reason: "ok" });
  });

  it("nepusti hosta do cizi loznice", () => {
    const decision = decideAccess(
      input({ guest: { bedroomSlug: "silver" } }),
    );
    expect(decision).toEqual({ allowed: false, reason: "wrong_room" });
  });

  it("pusti kazdeho aktivniho hosta do spolecneho prostoru", () => {
    const decision = decideAccess(
      input({
        accessPoint: { kind: "DOOR", enabled: true, bedroomSlug: null, isCommon: true },
        guest: { bedroomSlug: "blue" },
      }),
    );
    expect(decision.allowed).toBe(true);
  });

  it("zamitne hosta bez prideleneho pokoje", () => {
    const decision = decideAccess(input({ guest: { bedroomSlug: null } }));
    expect(decision).toEqual({ allowed: false, reason: "no_room_assigned" });
  });

  it("zamitne vypnutou ctecku drive nez cokoli jineho", () => {
    const decision = decideAccess(
      input({
        accessPoint: { kind: "DOOR", enabled: false, bedroomSlug: "gold", isCommon: false },
        credential: null,
      }),
    );
    expect(decision).toEqual({ allowed: false, reason: "access_point_disabled" });
  });
});

describe("decideAccess — prostredek", () => {
  it("zamitne neznamy prostredek", () => {
    expect(decideAccess(input({ credential: null }))).toEqual({
      allowed: false,
      reason: "credential_unknown",
    });
  });

  it("zamitne odvolanou kartu", () => {
    const decision = decideAccess(
      input({ credential: { status: "REVOKED", validFrom: ARRIVAL, validTo: DEPARTURE } }),
    );
    expect(decision).toEqual({ allowed: false, reason: "credential_revoked" });
  });

  it("zamitne kartu po platnosti", () => {
    const decision = decideAccess(
      input({
        credential: {
          status: "ACTIVE",
          validFrom: ARRIVAL,
          validTo: new Date("2026-08-11T00:00:00"),
        },
      }),
    );
    expect(decision).toEqual({ allowed: false, reason: "credential_expired" });
  });

  it("zamitne kartu, ktera jeste neplati", () => {
    const decision = decideAccess(
      input({
        credential: {
          status: "ACTIVE",
          validFrom: new Date("2026-08-14T00:00:00"),
          validTo: CARD_VALID_TO,
        },
      }),
    );
    expect(decision).toEqual({ allowed: false, reason: "credential_not_yet_valid" });
  });

  it("platnost karty se posuzuje driv nez okno pobytu", () => {
    // Karta propadla uz behem pobytu — duvod musi byt karta, ne okno.
    const decision = decideAccess(
      input({
        credential: { status: "ACTIVE", validFrom: ARRIVAL, validTo: DEPARTURE },
        now: new Date("2026-08-15T14:00:00"),
      }),
    );
    expect(decision).toEqual({ allowed: false, reason: "credential_expired" });
  });
});

describe("decideAccess — pobyt", () => {
  it("zamitne pobyt, ktery jeste neni odbaveny", () => {
    const decision = decideAccess(
      input({ stay: { status: "BOOKED", arrival: ARRIVAL, departure: DEPARTURE } }),
    );
    expect(decision).toEqual({ allowed: false, reason: "stay_not_checked_in" });
  });

  it("zamitne zruseny pobyt", () => {
    const decision = decideAccess(
      input({ stay: { status: "CANCELLED", arrival: ARRIVAL, departure: DEPARTURE } }),
    );
    expect(decision).toEqual({ allowed: false, reason: "stay_cancelled" });
  });

  it("zamitne pokus pred check-inem v den prijezdu", () => {
    // Check-in je v 16:00, tohle je rano.
    const decision = decideAccess(input({ now: new Date("2026-08-10T09:00:00") }));
    expect(decision).toEqual({ allowed: false, reason: "outside_stay_window" });
  });

  it("zamitne pokus po check-outu v den odjezdu", () => {
    // Check-out je v 10:00, tohle je odpoledne.
    const decision = decideAccess(input({ now: new Date("2026-08-15T14:00:00") }));
    expect(decision).toEqual({ allowed: false, reason: "outside_stay_window" });
  });

  it("okno respektuje casy z site.ts", () => {
    const w = stayWindow({ status: "CHECKED_IN", arrival: ARRIVAL, departure: DEPARTURE });
    expect(w.from.getHours()).toBe(16);
    expect(w.to.getHours()).toBe(10);
  });
});

describe("decideAccess — dok kolobezky", () => {
  const dock = {
    kind: "SCOOTER_DOCK" as const,
    enabled: true,
    bedroomSlug: null,
    isCommon: false,
  };

  it("pusti hosta k volne kolobezce", () => {
    const decision = decideAccess(
      input({ accessPoint: dock, scooter: { status: "AVAILABLE" }, hasOpenRental: false }),
    );
    expect(decision.allowed).toBe(true);
  });

  it("zamitne druhou soubeznou vypujcku", () => {
    const decision = decideAccess(
      input({ accessPoint: dock, scooter: { status: "AVAILABLE" }, hasOpenRental: true }),
    );
    expect(decision).toEqual({ allowed: false, reason: "rental_already_open" });
  });

  it("zamitne kolobezku v servisu", () => {
    const decision = decideAccess(
      input({ accessPoint: dock, scooter: { status: "MAINTENANCE" }, hasOpenRental: false }),
    );
    expect(decision).toEqual({ allowed: false, reason: "scooter_unavailable" });
  });

  it("zamitne, kdyz dok neposlal zadnou kolobezku", () => {
    const decision = decideAccess(
      input({ accessPoint: dock, scooter: null, hasOpenRental: false }),
    );
    expect(decision).toEqual({ allowed: false, reason: "scooter_unavailable" });
  });
});

describe("priceRental", () => {
  const pricing = { baseFeeCents: 2000, perMinuteCents: 300 };

  it("uctuje nastupni sazbu i zacatou minutu", () => {
    const start = new Date("2026-08-12T10:00:00");
    const end = new Date("2026-08-12T10:00:30");
    expect(priceRental(start, end, pricing)).toBe(2300);
  });

  it("zaokrouhluje zacatou minutu nahoru", () => {
    const start = new Date("2026-08-12T10:00:00");
    const end = new Date("2026-08-12T10:10:01");
    expect(priceRental(start, end, pricing)).toBe(2000 + 11 * 300);
  });

  it("uctuje minimalne jednu minutu", () => {
    const start = new Date("2026-08-12T10:00:00");
    expect(priceRental(start, start, pricing)).toBe(2300);
  });
});
