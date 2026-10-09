import { z } from "zod";
import { MAX_LINES, MAX_QUANTITY_PER_LINE } from "./pricing";

/**
 * Kosik je v cookie, ne v databazi: zakaznici nemaji ucet a anonymni kosiky
 * by jen plnily tabulku. V cookie je ale jen { id produktu, pocet } — cena
 * se VZDY cte znovu z databaze (viz cart-view.ts). Cookie je vstup od
 * klienta a klient si ji muze napsat, jak chce.
 */

export interface CartLine {
  productId: string;
  quantity: number;
}

export const CART_COOKIE = "t24_cart";

const lineSchema = z.object({
  p: z.string().min(1).max(64),
  q: z.number().int().min(1).max(MAX_QUANTITY_PER_LINE),
});

const cartSchema = z.array(lineSchema).max(MAX_LINES);

/** Rozparsuje cookie. Cokoli podezrelého = prazdny kosik, ne vyjimka. */
export function parseCart(raw: string | undefined | null): CartLine[] {
  if (!raw) return [];
  let json: unknown;
  try {
    json = JSON.parse(raw);
  } catch {
    return [];
  }
  const parsed = cartSchema.safeParse(json);
  if (!parsed.success) return [];

  // Slouci duplicity — rucne upravena cookie muze mit jeden produkt dvakrat.
  const merged = new Map<string, number>();
  for (const { p, q } of parsed.data) {
    merged.set(p, Math.min(MAX_QUANTITY_PER_LINE, (merged.get(p) ?? 0) + q));
  }
  return [...merged].map(([productId, quantity]) => ({ productId, quantity }));
}

export function serializeCart(lines: readonly CartLine[]): string {
  return JSON.stringify(lines.map((l) => ({ p: l.productId, q: l.quantity })));
}

export function addLine(lines: readonly CartLine[], productId: string, quantity: number): CartLine[] {
  const qty = clampQuantity(quantity);
  if (qty < 1) return [...lines];
  const existing = lines.find((l) => l.productId === productId);
  if (existing) {
    return lines.map((l) =>
      l.productId === productId
        ? { ...l, quantity: clampQuantity(l.quantity + qty) }
        : l,
    );
  }
  if (lines.length >= MAX_LINES) return [...lines];
  return [...lines, { productId, quantity: qty }];
}

/** Pocet 0 radek odstrani. */
export function setLine(lines: readonly CartLine[], productId: string, quantity: number): CartLine[] {
  const qty = clampQuantity(quantity);
  if (qty < 1) return lines.filter((l) => l.productId !== productId);
  return lines.map((l) => (l.productId === productId ? { ...l, quantity: qty } : l));
}

export function removeLine(lines: readonly CartLine[], productId: string): CartLine[] {
  return lines.filter((l) => l.productId !== productId);
}

export function countItems(lines: readonly CartLine[]): number {
  return lines.reduce((sum, l) => sum + l.quantity, 0);
}

function clampQuantity(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(MAX_QUANTITY_PER_LINE, Math.trunc(value)));
}
