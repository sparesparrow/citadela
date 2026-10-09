/**
 * Povolene prechody stavu objednavky. Cisty modul — pravidla musi byt
 * na jednom miste, protoze je pouziva admin UI (ktera tlacitka ukazat)
 * i server action (co dovolit). UI samo o sobe nic nezarucuje.
 */
export type OrderStatusKey = "NEW" | "PAID" | "FULFILLED" | "CANCELLED";
export type PaymentKey = "PREPAYMENT" | "CASH_ON_PICKUP";

/**
 * Zavisi na zpusobu platby: u platby predem se zbozi nevydava, dokud nepriste
 * penize (NEW -> PAID -> FULFILLED). U hotovosti se plati pri vyzvednuti, takze
 * "zaplaceno" jako samostatny krok nema smysl.
 */
export function allowedTransitions(
  from: OrderStatusKey,
  payment: PaymentKey,
): readonly OrderStatusKey[] {
  switch (from) {
    case "NEW":
      return payment === "CASH_ON_PICKUP" ? ["FULFILLED", "CANCELLED"] : ["PAID", "CANCELLED"];
    case "PAID":
      return ["FULFILLED", "CANCELLED"];
    // Vydane zbozi se uz nevraci jednim klikem — vratka je rucni proces.
    // Zrusenou objednavku nelze znovu otevrit: sklad uz byl vracen.
    case "FULFILLED":
    case "CANCELLED":
      return [];
  }
}

export function canTransition(
  from: OrderStatusKey,
  to: OrderStatusKey,
  payment: PaymentKey,
): boolean {
  return allowedTransitions(from, payment).includes(to);
}

/** Vraci zbozi na sklad? Ano jen pri zruseni — ostatni prechody zbozi nehybaji. */
export function restocksOn(to: OrderStatusKey): boolean {
  return to === "CANCELLED";
}
