import { describe, expect, it } from "vitest";
import {
  isMidweekStay,
  nightlyRate,
  nightsBetween,
  packagePrice,
  quoteStay,
  rentalTotal,
  stayLengthDiscount,
} from "./quote";
import { groupPricing, houseModeRules, pricing, rates, rentalBySlug } from "./site";

/**
 * Testy orientacni kalkulace.
 *
 * Dve mista se pletou nejsnaz: soucet slev (dvoutydenni firemni pobyt
 * v pracovnim tydnu by se bez stropu prodal pod cenu) a hranice
 * mimovikendoveho terminu — patecni nebo sobotni noc uz mimovikendova neni,
 * i kdyz pobyt zacina v nedeli.
 */

function day(iso: string): Date {
  return new Date(`${iso}T00:00:00.000Z`);
}

// ---------------------------------------------------------------------------
// Sazba za noc
// ---------------------------------------------------------------------------

describe("nightlyRate", () => {
  it("odpovida tydenni sazbe rozpoctene na noci", () => {
    const week = rates.find((rate) => rate.slug === "week")!;
    expect(nightlyRate() * week.nights).toBeCloseTo(week.price, -1);
  });
});

// ---------------------------------------------------------------------------
// Sleva za delku pobytu
// ---------------------------------------------------------------------------

describe("stayLengthDiscount", () => {
  it("kratky pobyt slevu nema", () => {
    expect(stayLengthDiscount(1)).toBe(0);
    expect(stayLengthDiscount(6)).toBe(0);
  });

  it("bere prvni pasmo, do ktereho se pobyt vejde", () => {
    expect(stayLengthDiscount(7)).toBe(5);
    expect(stayLengthDiscount(9)).toBe(5);
    expect(stayLengthDiscount(10)).toBe(10);
    expect(stayLengthDiscount(13)).toBe(10);
    expect(stayLengthDiscount(14)).toBe(15);
  });

  it("nad nejvyssim pasmem uz dal neroste", () => {
    expect(stayLengthDiscount(30)).toBe(15);
  });
});

// ---------------------------------------------------------------------------
// Mimovikendovy termin
// ---------------------------------------------------------------------------

describe("isMidweekStay", () => {
  it("nedele az ctvrtek je mimovikendovy pobyt", () => {
    expect(isMidweekStay(day("2026-09-06"), day("2026-09-10"))).toBe(true);
  });

  it("odjezd v patek se jeste pocita — patecni noc uz host nespi", () => {
    expect(isMidweekStay(day("2026-09-06"), day("2026-09-11"))).toBe(true);
  });

  it("patecni noc mimovikendovy pobyt rusi", () => {
    expect(isMidweekStay(day("2026-09-06"), day("2026-09-12"))).toBe(false);
  });

  it("sobotni noc uz mimovikendova neni", () => {
    expect(isMidweekStay(day("2026-09-07"), day("2026-09-13"))).toBe(false);
  });

  it("pobyt bez noci neplati", () => {
    expect(isMidweekStay(day("2026-09-07"), day("2026-09-07"))).toBe(false);
  });
});

describe("nightsBetween", () => {
  it("pocita noci, ne dny", () => {
    expect(nightsBetween(day("2026-09-06"), day("2026-09-13"))).toBe(7);
  });
});

// ---------------------------------------------------------------------------
// Pujcovna
// ---------------------------------------------------------------------------

describe("rentalTotal", () => {
  it("nasobi kusy a dny a scita kauce", () => {
    const boards = rentalBySlug.paddleboard;
    const result = rentalTotal([{ slug: "paddleboard", count: 4, days: 2 }]);
    expect(result.price).toBe(4 * 2 * boards.pricePerDay);
    expect(result.deposit).toBe(0);
  });

  it("nepujci vic kusu, nez kolik jich mame", () => {
    const boat = rentalBySlug.boat;
    const result = rentalTotal([{ slug: "boat", count: 3, days: 1 }]);
    expect(result.price).toBe(boat.fleet * boat.pricePerDay);
    expect(result.deposit).toBe(boat.fleet * (boat.deposit ?? 0));
  });

  it("prazdny vyber je nula", () => {
    expect(rentalTotal([])).toEqual({ price: 0, deposit: 0 });
  });
});

// ---------------------------------------------------------------------------
// Kalkulace pobytu
// ---------------------------------------------------------------------------

describe("quoteStay", () => {
  it("do zahrnuteho poctu osob se za osoby nepriplaci", () => {
    const quote = quoteStay({ nights: 3, guests: pricing.includedGuests });
    expect(quote.extraGuests).toBe(0);
    expect(quote.extraGuestTotal).toBe(0);
  });

  it("priplatek za osobu bezi za kazdou noc", () => {
    const guests = pricing.includedGuests + 5;
    const quote = quoteStay({ nights: 4, guests });
    expect(quote.extraGuests).toBe(5);
    expect(quote.extraGuestTotal).toBe(5 * pricing.extraGuestPerNight * 4);
  });

  it("sleva se pocita z ubytovani i z priplatku za osoby", () => {
    const quote = quoteStay({ nights: 7, guests: pricing.includedGuests + 5 });
    const before = quote.accommodation + quote.extraGuestTotal;
    expect(quote.discountPercent).toBe(5);
    expect(quote.discountAmount).toBe(Math.round((before * 5) / 100));
    expect(quote.stayTotal).toBe(before - quote.discountAmount);
  });

  it("mimovikendovy termin se scita se slevou za delku", () => {
    const quote = quoteStay({ nights: 7, guests: 20, midweek: true });
    expect(quote.discountPercent).toBe(5 + groupPricing.midweekPercent);
  });

  it("soucet slev nikdy neprelezne strop", () => {
    const quote = quoteStay({ nights: 21, guests: 30, midweek: true });
    expect(quote.discountPercent).toBe(groupPricing.maxDiscountPercent);
  });

  it("rekreacni poplatek plati dospeli, ne vsichni hoste", () => {
    const quote = quoteStay({ nights: 3, guests: 30, adults: 20 });
    expect(quote.touristTax).toBe(20 * 3 * pricing.touristTaxPerAdultNight);
  });

  it("celkova cena je pobyt po sleve plus pujcovna plus poplatek", () => {
    const quote = quoteStay({
      nights: 7,
      guests: 30,
      rentals: [{ slug: "paddleboard", count: 4, days: 2 }],
    });
    expect(quote.total).toBe(quote.stayTotal + quote.rentals + quote.touristTax);
  });

  it("kauce za techniku se pricita ke kauci za dum", () => {
    const quote = quoteStay({ nights: 2, guests: 10, rentals: [{ slug: "boat", count: 1, days: 1 }] });
    expect(quote.deposit).toBe(pricing.deposit + (rentalBySlug.boat.deposit ?? 0));
  });

  it("provoz s dozorem ma vlastni, vyssi kauci", () => {
    const adults = quoteStay({ nights: 3, guests: 30 });
    const supervised = quoteStay({ nights: 3, guests: 30, mode: "supervised" });
    expect(adults.deposit).toBe(houseModeRules.adults.deposit);
    expect(supervised.deposit).toBe(houseModeRules.supervised.deposit);
    expect(supervised.deposit).toBeGreaterThan(adults.deposit);
  });

  it("rezim nemeni cenu pobytu, jen kauci", () => {
    const adults = quoteStay({ nights: 3, guests: 30 });
    const supervised = quoteStay({ nights: 3, guests: 30, mode: "supervised" });
    expect(supervised.total).toBe(adults.total);
  });

  it("odmitne pobyt bez noci nebo bez hostu", () => {
    expect(() => quoteStay({ nights: 0, guests: 10 })).toThrow(RangeError);
    expect(() => quoteStay({ nights: 3, guests: 0 })).toThrow(RangeError);
  });
});

describe("packagePrice", () => {
  it("mensi skupina zaplati minimalni pocet osob", () => {
    expect(packagePrice(690, 6, 10)).toBe(6_900);
  });

  it("vetsi skupina plati za skutecny pocet", () => {
    expect(packagePrice(690, 18, 10)).toBe(12_420);
  });
});
