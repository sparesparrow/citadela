import { describe, expect, it } from "vitest";
import {
  addLine,
  countItems,
  parseCart,
  removeLine,
  serializeCart,
  setLine,
} from "./cart";
import { MAX_LINES, MAX_QUANTITY_PER_LINE } from "./pricing";

describe("parseCart", () => {
  it("round-trip", () => {
    const lines = [
      { productId: "a", quantity: 2 },
      { productId: "b", quantity: 1 },
    ];
    expect(parseCart(serializeCart(lines))).toEqual(lines);
  });

  it.each([undefined, null, "", "not json", "{}", '"x"', "[1,2]", '[{"p":"a"}]', '[{"p":"a","q":0}]', '[{"p":"a","q":-1}]', '[{"p":"a","q":1.5}]'])(
    "podezrely vstup %j => prazdny kosik",
    (raw) => {
      expect(parseCart(raw as string | undefined)).toEqual([]);
    },
  );

  it("slouci duplicity a omezi pocet", () => {
    const raw = JSON.stringify([
      { p: "a", q: 60 },
      { p: "a", q: 60 },
    ]);
    expect(parseCart(raw)).toEqual([{ productId: "a", quantity: MAX_QUANTITY_PER_LINE }]);
  });

  it("zahodi kosik s prilis mnoha radky", () => {
    const raw = JSON.stringify(Array.from({ length: MAX_LINES + 1 }, (_, i) => ({ p: `p${i}`, q: 1 })));
    expect(parseCart(raw)).toEqual([]);
  });
});

describe("addLine", () => {
  it("pridava novy produkt", () => {
    expect(addLine([], "a", 2)).toEqual([{ productId: "a", quantity: 2 }]);
  });

  it("sciita existujici radek", () => {
    expect(addLine([{ productId: "a", quantity: 1 }], "a", 2)).toEqual([
      { productId: "a", quantity: 3 },
    ]);
  });

  it("nepresahne maximum na radek", () => {
    const out = addLine([{ productId: "a", quantity: 98 }], "a", 50);
    expect(out[0].quantity).toBe(MAX_QUANTITY_PER_LINE);
  });

  it.each([0, -3, NaN, Infinity])("ignoruje nesmyslny pocet %s", (qty) => {
    // Infinity se orizne na maximum, ostatni se ignoruji
    const out = addLine([], "a", qty);
    expect(out.length === 0 || out[0].quantity === MAX_QUANTITY_PER_LINE).toBe(true);
  });

  it("neprekroci maximum radku", () => {
    const full = Array.from({ length: MAX_LINES }, (_, i) => ({ productId: `p${i}`, quantity: 1 }));
    expect(addLine(full, "novy", 1)).toHaveLength(MAX_LINES);
  });
});

describe("setLine / removeLine", () => {
  const base = [
    { productId: "a", quantity: 2 },
    { productId: "b", quantity: 1 },
  ];

  it("zmeni pocet", () => {
    expect(setLine(base, "a", 5)[0].quantity).toBe(5);
  });

  it("pocet 0 radek odstrani", () => {
    expect(setLine(base, "a", 0)).toEqual([{ productId: "b", quantity: 1 }]);
  });

  it("removeLine odstrani", () => {
    expect(removeLine(base, "b")).toEqual([{ productId: "a", quantity: 2 }]);
  });

  it("countItems secte kusy", () => {
    expect(countItems(base)).toBe(3);
  });
});
