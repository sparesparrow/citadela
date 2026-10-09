/**
 * Obchodni pravidla cen: MwSt a postovne. Cisty modul bez zavislosti na
 * databazi ani na env, aby ho mohl pouzit i klientsky formular v pokladne
 * (zobrazeni souctu se musi shodovat s tim, co spocita server).
 */

/**
 * Zakladni sazba svycarske MwSt od 1. 1. 2024: 8,1 %. V setinach procenta.
 * Nastavte na 0, kdyz obchod neni MwSt-povinny (obrat pod 100 000 CHF) —
 * souhrny pak MwSt vubec neukazuji.
 */
export const VAT_RATE_BP = 810;

/** Postovne. HODNOTY JSOU ZASTUPNE — nastavte podle skutecneho tarifu Posty. */
export const SHIPPING = {
  flatCents: 990,
  /** Od teto hodnoty zbozi je postovne zdarma. */
  freeFromCents: 15_000,
} as const;

export const MAX_QUANTITY_PER_LINE = 99;
export const MAX_LINES = 50;

export type DeliveryKind = "SHIPPING" | "PICKUP";

/**
 * Kolik MwSt je OBSAZENO v koncove cene. Ceny v obchode jsou vcetne dane,
 * takze se dan nepricita, ale vytahuje: gross * rate / (100 % + rate).
 */
export function vatIncluded(grossCents: number, rateBp: number = VAT_RATE_BP): number {
  if (rateBp <= 0) return 0;
  return Math.round((grossCents * rateBp) / (10_000 + rateBp));
}

export function shippingFor(delivery: DeliveryKind, subtotalCents: number): number {
  if (delivery === "PICKUP") return 0;
  if (subtotalCents <= 0) return 0;
  return subtotalCents >= SHIPPING.freeFromCents ? 0 : SHIPPING.flatCents;
}

export interface Totals {
  subtotalCents: number;
  shippingCents: number;
  totalCents: number;
  vatCents: number;
  vatRateBp: number;
}

export function computeTotals(
  lines: ReadonlyArray<{ unitCents: number; quantity: number }>,
  delivery: DeliveryKind,
): Totals {
  const subtotalCents = lines.reduce((sum, l) => sum + l.unitCents * l.quantity, 0);
  const shippingCents = shippingFor(delivery, subtotalCents);
  const totalCents = subtotalCents + shippingCents;
  return {
    subtotalCents,
    shippingCents,
    totalCents,
    vatCents: vatIncluded(totalCents),
    vatRateBp: VAT_RATE_BP,
  };
}

/** 810 -> "8.1" (svycarsky zapis s teckou). */
export function formatVatRate(rateBp: number): string {
  return String(rateBp / 100);
}
