import { describe, expect, it } from "vitest";
import { SHIPPING, computeTotals, formatVatRate, shippingFor, vatIncluded } from "./pricing";

describe("vatIncluded", () => {
  it("vytahne dan z koncove ceny, nepricita ji", () => {
    // 108.10 CHF vcetne 8,1 % => dan 8.10
    expect(vatIncluded(10_810, 810)).toBe(810);
  });

  it("zaokrouhluje na Rappen", () => {
    // 10.00 * 8.1/108.1 = 0.7493... => 75 Rp
    expect(vatIncluded(1000, 810)).toBe(75);
  });

  it("sazba 0 (neplatce) vrati 0", () => {
    expect(vatIncluded(10_000, 0)).toBe(0);
  });

  it("nula je nula", () => {
    expect(vatIncluded(0, 810)).toBe(0);
  });
});

describe("shippingFor", () => {
  it("vyzvednuti je zdarma", () => {
    expect(shippingFor("PICKUP", 500)).toBe(0);
  });

  it("pod hranici se plati pausal", () => {
    expect(shippingFor("SHIPPING", SHIPPING.freeFromCents - 1)).toBe(SHIPPING.flatCents);
  });

  it("presne na hranici je zdarma", () => {
    expect(shippingFor("SHIPPING", SHIPPING.freeFromCents)).toBe(0);
  });

  it("prazdny kosik nic neplati", () => {
    expect(shippingFor("SHIPPING", 0)).toBe(0);
  });
});

describe("computeTotals", () => {
  it("secte radky, postovne a dan z celku", () => {
    const t = computeTotals(
      [
        { unitCents: 2500, quantity: 2 },
        { unitCents: 1990, quantity: 1 },
      ],
      "SHIPPING",
    );
    expect(t.subtotalCents).toBe(6990);
    expect(t.shippingCents).toBe(SHIPPING.flatCents);
    expect(t.totalCents).toBe(6990 + SHIPPING.flatCents);
    expect(t.vatCents).toBe(Math.round((t.totalCents * 810) / 10_810));
  });

  it("postovne je soucasti zdanitelneho celku", () => {
    const withShip = computeTotals([{ unitCents: 1000, quantity: 1 }], "SHIPPING");
    const pickup = computeTotals([{ unitCents: 1000, quantity: 1 }], "PICKUP");
    expect(withShip.vatCents).toBeGreaterThan(pickup.vatCents);
  });
});

describe("formatVatRate", () => {
  it("810 -> 8.1", () => expect(formatVatRate(810)).toBe("8.1"));
});
