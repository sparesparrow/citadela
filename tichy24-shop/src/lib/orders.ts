import "server-only";
import { randomBytes } from "node:crypto";
import { prisma } from "./prisma";
import type { CartLine } from "./cart";
import type { CheckoutData } from "./checkout";
import { computeTotals } from "./pricing";
import { canTransition, restocksOn, type OrderStatusKey } from "./order-status";

export class EmptyCartError extends Error {
  constructor() {
    super("Kosik je prazdny.");
  }
}

/** Produkt zmizel z prodeje nebo uz neexistuje. */
export class ProductUnavailableError extends Error {
  constructor(readonly productId: string) {
    super(`Produkt ${productId} neni k dispozici.`);
  }
}

export class OutOfStockError extends Error {
  constructor(
    readonly productName: string,
    readonly available: number,
  ) {
    super(`Nedostatek zbozi: ${productName} (skladem ${available}).`);
  }
}

/**
 * Zalozi objednavku a atomicky odecte sklad.
 *
 * Kontrola "je dost kusu?" a odecteni NESMI byt dva kroky (nacist, porovnat,
 * ulozit): dva zakaznici by oba uvideli posledni kus a oba by ho koupili.
 * Proto jeden `UPDATE ... WHERE stock >= n`; databaze radek zamkne a druhy
 * soubezny pozadavek po uvolneni zamku podminku vyhodnoti znovu a neprojde.
 * Je to stejny princip jako unique klic u rezervaci v citadela-app.
 *
 * Cela operace je jedna transakce — kdyz selze kterykoli radek, sklad
 * u predchozich se vrati.
 */
export async function placeOrder(data: CheckoutData, lines: readonly CartLine[]) {
  if (lines.length === 0) throw new EmptyCartError();

  return prisma.$transaction(async (tx) => {
    const products = await tx.product.findMany({
      where: { id: { in: lines.map((l) => l.productId) }, active: true },
    });
    const byId = new Map(products.map((p) => [p.id, p]));

    // Radky se zamykaji ve stejnem poradi (podle id), aby dve objednavky
    // se stejnymi produkty v ruznem poradi nevytvorily deadlock.
    const ordered = [...lines].sort((a, b) => a.productId.localeCompare(b.productId));
    for (const line of ordered) {
      const product = byId.get(line.productId);
      if (!product) throw new ProductUnavailableError(line.productId);

      const res = await tx.product.updateMany({
        where: { id: product.id, active: true, stock: { gte: line.quantity } },
        data: { stock: { decrement: line.quantity } },
      });
      if (res.count !== 1) throw new OutOfStockError(product.name, product.stock);
    }

    // Ceny jdou z databaze, nikdy z cookie.
    const priced = lines.map((l) => {
      const p = byId.get(l.productId)!;
      return { product: p, quantity: l.quantity, unitCents: p.priceCents };
    });
    const totals = computeTotals(priced, data.deliveryMethod);

    return tx.order.create({
      data: {
        publicToken: randomBytes(18).toString("base64url"),
        deliveryMethod: data.deliveryMethod,
        paymentMethod: data.paymentMethod,
        email: data.email,
        phone: data.phone,
        name: data.name,
        street: data.street,
        postalCode: data.postalCode,
        city: data.city,
        country: data.country,
        note: data.note,
        subtotalCents: totals.subtotalCents,
        shippingCents: totals.shippingCents,
        totalCents: totals.totalCents,
        vatCents: totals.vatCents,
        vatRateBp: totals.vatRateBp,
        items: {
          create: priced.map((i) => ({
            productId: i.product.id,
            sku: i.product.sku,
            name: i.product.name,
            unitCents: i.unitCents,
            quantity: i.quantity,
          })),
        },
      },
    });
  });
}

export type StatusChangeResult = "ok" | "not_found" | "invalid_transition";

/**
 * Zmena stavu z administrace. Pravidla prechodu jsou v order-status.ts;
 * `updateMany` s podminkou na puvodni stav chrani pred dvema soubeznymi
 * kliky (napr. dvojite zruseni by jinak vratilo sklad dvakrat).
 */
export async function changeOrderStatus(
  orderId: string,
  to: OrderStatusKey,
): Promise<StatusChangeResult> {
  return prisma.$transaction(async (tx) => {
    const order = await tx.order.findUnique({
      where: { id: orderId },
      include: { items: true },
    });
    if (!order) return "not_found";
    if (!canTransition(order.status, to, order.paymentMethod)) return "invalid_transition";

    const now = new Date();
    const res = await tx.order.updateMany({
      where: { id: orderId, status: order.status },
      data: {
        status: to,
        ...(to === "PAID" ? { paidAt: now } : {}),
        // Hotovost se plati pri vyzvednuti, takze vydani = zaplaceni.
        ...(to === "FULFILLED"
          ? { fulfilledAt: now, ...(order.paidAt ? {} : { paidAt: now }) }
          : {}),
        ...(to === "CANCELLED" ? { cancelledAt: now } : {}),
      },
    });
    if (res.count !== 1) return "invalid_transition";

    if (restocksOn(to)) {
      for (const item of order.items) {
        await tx.product.update({
          where: { id: item.productId },
          data: { stock: { increment: item.quantity } },
        });
      }
    }
    return "ok";
  });
}
