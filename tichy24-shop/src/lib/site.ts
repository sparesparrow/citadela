/**
 * Strukturalni zdroj pravdy o obchodu: identita, kontakt, navigace.
 * Texty zijou ve slovniku (src/dictionaries), cisla a slugy tady.
 * Obchodni konstanty (MwSt, postovne) jsou v pricing.ts.
 *
 * !! Hodnoty v hranatych zavorkach jsou ZASTUPNE a pred spustenim je nutne
 * !! je nahradit — viz README, "Pred spustenim". Dokud je SHOP_LIVE != 1,
 * !! web posila noindex, takze zastupne udaje nezaindexuje vyhledavac.
 */
export const site = {
  name: "tichy24.ch",
  owner: "Dušan Tichý",
  tagline: "Ihr Allrounder-Mechaniker",
  domain: "tichy24.ch",
  url: (process.env.SITE_URL ?? "https://tichy24.ch").replace(/\/$/, ""),

  contact: {
    email: "info@tichy24.ch",
    phone: "[Telefonnummer]",
    street: "[Strasse und Nr.]",
    postalCode: "[PLZ]",
    city: "[Ort]",
    /** Unternehmens-Identifikationsnummer, Format CHE-123.456.789 */
    uid: "[CHE-xxx.xxx.xxx]",
    /** Oeffnungszeiten fuer die Abholung — pouze text. */
    pickupHours: "nach Vereinbarung",
  },

  bank: {
    holder: process.env.SHOP_BANK_HOLDER ?? "Dušan Tichý",
    iban: process.env.SHOP_IBAN ?? "",
  },
} as const;

/** Je web uz verejny? Rozhoduje o noindex a robots.txt. */
export function isLive(): boolean {
  return process.env.SHOP_LIVE === "1";
}

/** Zbyvaji v kontaktnich udajich zastupne hodnoty? */
export function placeholdersLeft(): string[] {
  return Object.entries(site.contact)
    .filter(([, v]) => typeof v === "string" && v.startsWith("["))
    .map(([k]) => k);
}

/** "T24-00042" */
export function formatOrderNumber(n: number): string {
  return `T24-${String(n).padStart(5, "0")}`;
}
