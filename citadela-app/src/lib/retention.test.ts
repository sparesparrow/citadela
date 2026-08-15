import { afterEach, describe, expect, it, vi } from "vitest";
import { DEFAULT_RETENTION_DAYS, retentionCutoff, retentionDays } from "./retention";

/**
 * Retence maze osobni udaje. Chyba v jednom smeru znamena, ze je drzime
 * dele, nez smime; v druhem smeru, ze prijdeme o audit. Obe strany proto
 * kontrolujeme vcetne nesmyslnych vstupu.
 */

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("retentionDays", () => {
  it("bez nastaveni plati vychozich 90 dnu", () => {
    vi.stubEnv("ACCESS_EVENT_RETENTION_DAYS", "");
    expect(retentionDays()).toBe(DEFAULT_RETENTION_DAYS);
  });

  it("prebira hodnotu z prostredi", () => {
    vi.stubEnv("ACCESS_EVENT_RETENTION_DAYS", "30");
    expect(retentionDays()).toBe(30);
  });

  it("nulu ignoruje — smazala by i dnesni zaznamy", () => {
    vi.stubEnv("ACCESS_EVENT_RETENTION_DAYS", "0");
    expect(retentionDays()).toBe(DEFAULT_RETENTION_DAYS);
  });

  it("zaporne cislo ignoruje", () => {
    vi.stubEnv("ACCESS_EVENT_RETENTION_DAYS", "-5");
    expect(retentionDays()).toBe(DEFAULT_RETENTION_DAYS);
  });

  it("nesmysl ignoruje", () => {
    vi.stubEnv("ACCESS_EVENT_RETENTION_DAYS", "devadesat");
    expect(retentionDays()).toBe(DEFAULT_RETENTION_DAYS);
  });

  it("desetinne cislo orizne dolu", () => {
    vi.stubEnv("ACCESS_EVENT_RETENTION_DAYS", "30.9");
    expect(retentionDays()).toBe(30);
  });
});

describe("retentionCutoff", () => {
  const now = new Date("2026-08-15T12:00:00Z");

  it("odecte spravny pocet dnu", () => {
    expect(retentionCutoff(now, 90).toISOString()).toBe("2026-05-17T12:00:00.000Z");
  });

  it("hranice lezi v minulosti, nikdy v budoucnosti", () => {
    expect(retentionCutoff(now).getTime()).toBeLessThan(now.getTime());
  });
});
