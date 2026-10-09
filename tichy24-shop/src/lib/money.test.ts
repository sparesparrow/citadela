import { describe, expect, it } from "vitest";
import { centsToInput, formatChf, parseChfToCents } from "./money";

/** Intl vklada nezlomitelne mezery; test nema padat kvuli verzi ICU. */
const norm = (v: string) => v.replace(/[\s  ]+/g, " ");

describe("formatChf", () => {
  it("pouziva CHF a dve desetinna mista", () => {
    const out = norm(formatChf(1250));
    expect(out).toContain("CHF");
    expect(out).toContain("12.50");
  });

  it("nulu vypise, neschova", () => {
    expect(norm(formatChf(0))).toContain("0.00");
  });
});

describe("parseChfToCents", () => {
  it.each([
    ["12.50", 1250],
    ["12,5", 1250],
    ["12", 1200],
    ["0.05", 5],
    ["1'250.00", 125_000],
    ["  99,99 ", 9999],
  ])("%s -> %i", (input, cents) => {
    expect(parseChfToCents(input)).toBe(cents);
  });

  it.each(["", "abc", "-5", "1.234", "12.5.0", "1e3", "NaN", "999999999"])(
    "odmitne %j",
    (input) => {
      expect(parseChfToCents(input)).toBeNull();
    },
  );

  it("nerozbije float: 0.1 + 0.2 styl chyby se nestane", () => {
    expect(parseChfToCents("0.29")).toBe(29);
    expect(parseChfToCents("1.15")).toBe(115);
  });
});

describe("centsToInput", () => {
  it("je inverzni k parseChfToCents", () => {
    for (const cents of [0, 5, 99, 1250, 125_000]) {
      expect(parseChfToCents(centsToInput(cents))).toBe(cents);
    }
  });
});
