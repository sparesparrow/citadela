/** Male ciste pomucky katalogu (sklad, slug). */

/** Od tohoto poctu kusu a mene se u produktu ukazuje "Nur noch N". */
export const LOW_STOCK_THRESHOLD = 5;

export type StockLevel = "in" | "low" | "out";

export function stockLevel(stock: number): StockLevel {
  if (stock <= 0) return "out";
  return stock <= LOW_STOCK_THRESHOLD ? "low" : "in";
}

/** Slug do URL: male pismena, cislice a pomlcky, bez pomlcky na okrajich. */
export const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/** "Drehmomentschlüssel 40–200 Nm" -> "drehmomentschluessel-40-200-nm" */
export function slugify(input: string): string {
  return input
    .toLowerCase()
    .replace(/ä/g, "ae")
    .replace(/ö/g, "oe")
    .replace(/ü/g, "ue")
    .replace(/ß/g, "ss")
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}
