import { describe, expect, it } from "vitest";
import { LOW_STOCK_THRESHOLD, SLUG_RE, slugify, stockLevel } from "./catalog";

describe("stockLevel", () => {
  it("rozlisuje vyprodano / malo / dost", () => {
    expect(stockLevel(0)).toBe("out");
    expect(stockLevel(-2)).toBe("out");
    expect(stockLevel(1)).toBe("low");
    expect(stockLevel(LOW_STOCK_THRESHOLD)).toBe("low");
    expect(stockLevel(LOW_STOCK_THRESHOLD + 1)).toBe("in");
  });
});

describe("slugify", () => {
  it.each([
    ["Drehmomentschlüssel 40–200 Nm", "drehmomentschluessel-40-200-nm"],
    ["  Öl & Fett  ", "oel-fett"],
    ["Straße", "strasse"],
    ["Přílba č. 3", "prilba-c-3"],
    ["---", ""],
  ])("%s -> %s", (input, out) => {
    expect(slugify(input)).toBe(out);
  });

  it("vysledek vzdy vyhovuje SLUG_RE (kdyz neni prazdny)", () => {
    const s = slugify("Mein Produkt #1 (neu!)");
    expect(SLUG_RE.test(s)).toBe(true);
  });
});

describe("SLUG_RE", () => {
  it.each(["a", "a-b", "a1-b2"])("prijme %s", (s) => expect(SLUG_RE.test(s)).toBe(true));
  it.each(["", "-a", "a-", "a--b", "A", "a b", "ä"])("odmitne %j", (s) => expect(SLUG_RE.test(s)).toBe(false));
});
