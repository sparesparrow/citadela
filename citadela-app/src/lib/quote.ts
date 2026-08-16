/**
 * Orientační kalkulace skupinového pobytu.
 *
 * Čistá funkce bez databáze, aby se dala testovat i zavolat na serveru při
 * vykreslování ceníku. Není to fakturace — je to číslo, které má host vidět
 * dřív, než napíše poptávku, protože firma bez čísla nabídku neschválí.
 *
 * Vše počítá v celých korunách, stejně jako `rates` a `pricing` v site.ts.
 * Halíře patří do folia přístupového systému, ne sem.
 */

import {
  pricing,
  rates,
  stayLengthTiers,
  groupPricing,
  rentalBySlug,
  houseModeRules,
  type HouseMode,
  type RentalKey,
} from "./site";

/** Kolik nocí je mezi dvěma daty. */
export function nightsBetween(arrival: Date, departure: Date): number {
  return Math.round((departure.getTime() - arrival.getTime()) / 86_400_000);
}

/**
 * Cena za noc mimo pevné balíčky. Odvozuje se z týdenní sazby, aby
 * neexistovala druhá cena, kterou by někdo musel udržovat zvlášť.
 */
export function nightlyRate(): number {
  const week = rates.find((rate) => rate.slug === "week");
  if (!week) throw new Error("V rates chybí týdenní sazba, ze které se počítá cena za noc.");
  return Math.round(week.price / week.nights);
}

/** Sleva za délku pobytu v procentech; 0 u krátkých pobytů. */
export function stayLengthDiscount(nights: number): number {
  return stayLengthTiers.find((tier) => nights >= tier.minNights)?.percent ?? 0;
}

/**
 * Proběhne celý pobyt v pracovním týdnu? Rozhoduje noc, ne den: pobyt
 * neděle–čtvrtek je mimovíkendový, pátek nebo sobota v něm být nesmí.
 * Data přicházejí jako půlnoc v UTC, proto UTC gettery.
 */
export function isMidweekStay(arrival: Date, departure: Date): boolean {
  const nights = nightsBetween(arrival, departure);
  if (nights < 1) return false;
  for (let i = 0; i < nights; i++) {
    const day = new Date(arrival.getTime() + i * 86_400_000).getUTCDay();
    if (day === 5 || day === 6) return false;
  }
  return true;
}

export interface RentalSelection {
  slug: RentalKey;
  /** Kolik kusů; nad velikost flotily kalkulace nejde. */
  count: number;
  /** Na kolik dní. */
  days: number;
}

export interface RentalTotal {
  price: number;
  deposit: number;
}

/** Součet půjčovného a kaucí. Požadavek nad velikost flotily se ořízne. */
export function rentalTotal(selection: RentalSelection[]): RentalTotal {
  return selection.reduce<RentalTotal>(
    (sum, want) => {
      const item = rentalBySlug[want.slug];
      const count = Math.max(0, Math.min(want.count, item.fleet));
      const days = Math.max(0, want.days);
      return {
        price: sum.price + count * days * item.pricePerDay,
        deposit: sum.deposit + count * (item.deposit ?? 0),
      };
    },
    { price: 0, deposit: 0 },
  );
}

export interface QuoteInput {
  nights: number;
  guests: number;
  /** Dospělí platí rekreační poplatek; ve výchozím stavu jsou to všichni. */
  adults?: number;
  /** Pobyt celý v pracovním týdnu. */
  midweek?: boolean;
  /** Režim domu; skupiny s dozorem mají vyšší kauci. */
  mode?: HouseMode;
  rentals?: RentalSelection[];
}

export interface Quote {
  nights: number;
  guests: number;
  /** Ubytování za celý dům, před slevou. */
  accommodation: number;
  /** Počet osob nad rámec zahrnutých v ceně. */
  extraGuests: number;
  extraGuestTotal: number;
  /** Sleva za délku pobytu a mimovíkendový termín, po zastropování. */
  discountPercent: number;
  discountAmount: number;
  rentals: number;
  touristTax: number;
  /** Ubytování po slevě, bez poplatku a bez půjčovného. */
  stayTotal: number;
  total: number;
  /** Vratná kauce za dům a za zapůjčenou techniku. */
  deposit: number;
}

/**
 * Sestaví kalkulaci. Slevy se sčítají, ale jen do `maxDiscountPercent` —
 * dvoutýdenní firemní pobyt v pracovním týdnu by se jinak dostal pod cenu,
 * za kterou dům vůbec dává smysl otevřít.
 */
export function quoteStay(input: QuoteInput): Quote {
  const { nights, guests, midweek = false, mode = "adults", rentals = [] } = input;
  if (!Number.isFinite(nights) || nights < 1) throw new RangeError("Pobyt musí mít aspoň jednu noc.");
  if (!Number.isFinite(guests) || guests < 1) throw new RangeError("Pobyt musí mít aspoň jednoho hosta.");

  const adults = input.adults ?? guests;
  const accommodation = nightlyRate() * nights;
  const extraGuests = Math.max(0, guests - pricing.includedGuests);
  const extraGuestTotal = extraGuests * pricing.extraGuestPerNight * nights;

  const discountPercent = Math.min(
    groupPricing.maxDiscountPercent,
    stayLengthDiscount(nights) + (midweek ? groupPricing.midweekPercent : 0),
  );
  const beforeDiscount = accommodation + extraGuestTotal;
  const discountAmount = Math.round((beforeDiscount * discountPercent) / 100);
  const stayTotal = beforeDiscount - discountAmount;

  const rentalSum = rentalTotal(rentals);
  const touristTax = Math.max(0, adults) * nights * pricing.touristTaxPerAdultNight;

  return {
    nights,
    guests,
    accommodation,
    extraGuests,
    extraGuestTotal,
    discountPercent,
    discountAmount,
    rentals: rentalSum.price,
    touristTax,
    stayTotal,
    total: stayTotal + rentalSum.price + touristTax,
    deposit: houseModeRules[mode].deposit + rentalSum.deposit,
  };
}

/** Cena programového balíčku pro danou skupinu. */
export function packagePrice(perPerson: number, guests: number, minGuests: number): number {
  return perPerson * Math.max(guests, minGuests);
}
