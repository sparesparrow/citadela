/**
 * Penize. V databazi i ve vsech vypoctech jsou cele cislo v nejmensi jednotce
 * meny (Rappen) — nikdy float. Na desetinne cislo se prevadi az pri zobrazeni.
 */

/** "CHF 1'234.50" — svycarsky zapis tisicu a desetinne tecky. */
export function formatChf(cents: number): string {
  return new Intl.NumberFormat("de-CH", {
    style: "currency",
    currency: "CHF",
    minimumFractionDigits: 2,
  }).format(cents / 100);
}

/**
 * Prevede zadani z formulare ("12.50", "12,5", "1'250") na Rappen.
 * Vraci null, kdyz to neni platna nezaporna castka — volajici rozhodne,
 * co s chybou; ticha oprava by u ceny byla horsi nez odmitnuti.
 */
export function parseChfToCents(input: string): number | null {
  const cleaned = input.trim().replace(/['’\s]/g, "").replace(",", ".");
  if (!/^\d+(\.\d{1,2})?$/.test(cleaned)) return null;
  const [whole, frac = ""] = cleaned.split(".");
  const cents = Number(whole) * 100 + Number(frac.padEnd(2, "0"));
  return Number.isSafeInteger(cents) && cents <= 100_000_000 ? cents : null;
}

/** Opak: Rappen -> text do inputu ("12.50"). */
export function centsToInput(cents: number): string {
  return (cents / 100).toFixed(2);
}
