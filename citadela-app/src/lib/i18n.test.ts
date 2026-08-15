import { describe, expect, it } from "vitest";
import { formatDate, formatPrice, isLocale, locales } from "./i18n";

/**
 * Testy formatovani. Zamerne netestujeme presny retezec — Intl meni
 * mezery (pevna vs. uzka pevna) mezi verzemi ICU a takovy test by padal
 * bez toho, ze by se cokoli rozbilo. Kontrolujeme to, na cem opravdu zalezi:
 * spravna mena, spravny jazyk, zadna desetinna mista.
 */

/** Sjednoti vsechny druhy mezer, aby test neprojel/nespadl kvuli ICU. */
function norm(value: string): string {
  return value.replace(/[  \s]+/g, " ").trim();
}

describe("formatPrice", () => {
  it("cesky format pouziva korunu a nema desetinna mista", () => {
    const out = norm(formatPrice(85_000, "cs"));
    expect(out).toContain("Kč");
    expect(out).toContain("85 000");
    expect(out).not.toContain(",00");
  });

  it("anglicky format take uctuje v korunach — mena se nemeni s jazykem", () => {
    const out = norm(formatPrice(85_000, "en"));
    expect(out).toMatch(/CZK|Kč/);
    expect(out).toContain("85,000");
  });

  it("nulu vypise, neschova", () => {
    expect(norm(formatPrice(0, "cs"))).toContain("0");
  });

  it("zaokrouhluje na cele koruny", () => {
    expect(norm(formatPrice(1234.56, "cs"))).toContain("1 235");
  });
});

describe("formatDate", () => {
  // Pevne datum, aby test nezavisel na dnesku.
  const date = new Date("2026-08-15T12:00:00Z");

  it("cesky vypise mesic slovem", () => {
    expect(formatDate(date, "cs")).toContain("srpna");
  });

  it("anglicky vypise mesic anglicky", () => {
    expect(formatDate(date, "en")).toContain("August");
  });

  it("obe varianty obsahuji den i rok", () => {
    for (const locale of locales) {
      const out = formatDate(date, locale);
      expect(out).toContain("15");
      expect(out).toContain("2026");
    }
  });
});

describe("isLocale", () => {
  it("pozna podporovane jazyky", () => {
    expect(isLocale("cs")).toBe(true);
    expect(isLocale("en")).toBe(true);
  });

  it("odmitne vse ostatni vcetne prazdnych hodnot", () => {
    expect(isLocale("de")).toBe(false);
    expect(isLocale("")).toBe(false);
    expect(isLocale(undefined)).toBe(false);
    expect(isLocale(null)).toBe(false);
  });
});
