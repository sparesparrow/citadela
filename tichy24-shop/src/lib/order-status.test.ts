import { describe, expect, it } from "vitest";
import { allowedTransitions, canTransition, restocksOn } from "./order-status";

describe("prechody stavu objednavky", () => {
  it("platba predem: nova se muze zaplatit nebo zrusit, ale ne rovnou vydat", () => {
    expect(allowedTransitions("NEW", "PREPAYMENT")).toEqual(["PAID", "CANCELLED"]);
    expect(canTransition("NEW", "FULFILLED", "PREPAYMENT")).toBe(false);
  });

  it("hotovost: nova se vydava pri vyzvednuti, krok 'zaplaceno' odpada", () => {
    expect(allowedTransitions("NEW", "CASH_ON_PICKUP")).toEqual(["FULFILLED", "CANCELLED"]);
    expect(canTransition("NEW", "PAID", "CASH_ON_PICKUP")).toBe(false);
  });

  it("zaplacenou lze vydat nebo zrusit (vratka penez je rucni)", () => {
    expect(canTransition("PAID", "FULFILLED", "PREPAYMENT")).toBe(true);
    expect(canTransition("PAID", "CANCELLED", "PREPAYMENT")).toBe(true);
    expect(canTransition("PAID", "NEW", "PREPAYMENT")).toBe(false);
  });

  it.each(["PREPAYMENT", "CASH_ON_PICKUP"] as const)(
    "vydanou ani zrusenou uz nelze nikam posunout (%s)",
    (payment) => {
      expect(allowedTransitions("FULFILLED", payment)).toEqual([]);
      expect(allowedTransitions("CANCELLED", payment)).toEqual([]);
    },
  );

  it("na sklad se vraci jen pri zruseni", () => {
    expect(restocksOn("CANCELLED")).toBe(true);
    expect(restocksOn("PAID")).toBe(false);
    expect(restocksOn("FULFILLED")).toBe(false);
  });
});
