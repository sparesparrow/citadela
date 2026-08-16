import { describe, expect, it } from "vitest";
import {
  amenityKeys,
  houseModeFor,
  houseModeRules,
  isSegmentKey,
  rentalBySlug,
  rentalItems,
  rentalPackageList,
  segmentList,
  segments,
  supervisedSegments,
} from "./site";

/**
 * Ciselniky ze site.ts drzi obchodni nabidku. Testy hlidaji to, co typy
 * neuhlidaji: ze rezim domu plyne ze segmentu (a ne z toho, co poslal
 * prohlizec) a ze v seznamech nezustal odkaz na neco, co uz neexistuje.
 */

describe("isSegmentKey", () => {
  it("zna vsechny segmenty z ciselniku", () => {
    for (const slug of segments) expect(isSegmentKey(slug)).toBe(true);
  });

  it("neznamy nebo zruseny slug odmitne", () => {
    expect(isSegmentKey("other")).toBe(false);
    expect(isSegmentKey("vikend")).toBe(false);
  });
});

describe("houseModeFor", () => {
  it("skolni vylety a tabory jedou s dozorem", () => {
    for (const slug of supervisedSegments) expect(houseModeFor(slug)).toBe("supervised");
  });

  it("ostatni segmenty jedou v beznem provozu", () => {
    expect(houseModeFor("corporate")).toBe("adults");
    expect(houseModeFor("wedding")).toBe("adults");
    expect(houseModeFor("holiday")).toBe("adults");
  });

  it("neuvedeny segment nesmi dum prepnout do rezimu s dozorem", () => {
    expect(houseModeFor("other")).toBe("adults");
  });
});

describe("houseModeRules", () => {
  it("rezim s dozorem uzamyka jen vybaveni, ktere v ciselniku existuje", () => {
    for (const key of houseModeRules.supervised.lockedAmenities) {
      expect(amenityKeys).toContain(key);
    }
  });

  it("bezny provoz nic nezamyka a nema rozvrh", () => {
    expect(houseModeRules.adults.lockedAmenities).toEqual([]);
    expect(houseModeRules.adults.timetabledWellness).toBe(false);
    expect(houseModeRules.adults.requiresSupervisors).toBe(false);
  });
});

describe("ciselniky nabidky", () => {
  it("kazdy segment doporucuje jen techniku, kterou mame", () => {
    for (const segment of segmentList) {
      for (const key of segment.rentals) expect(rentalBySlug[key]).toBeDefined();
    }
  });

  it("balicky skladaji jen techniku, kterou mame", () => {
    for (const pack of rentalPackageList) {
      for (const key of pack.includes) expect(rentalBySlug[key]).toBeDefined();
    }
  });

  it("kazdy kus techniky je aspon jednou k dispozici a ma cenu", () => {
    for (const item of rentalItems) {
      expect(item.fleet).toBeGreaterThan(0);
      expect(item.pricePerDay).toBeGreaterThan(0);
    }
  });
});
