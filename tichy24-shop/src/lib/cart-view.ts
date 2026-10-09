import "server-only";
import { prisma } from "./prisma";
import type { CartLine } from "./cart";

export interface CartItemView {
  productId: string;
  slug: string;
  name: string;
  sku: string;
  imageUrl: string | null;
  categorySlug: string;
  unitCents: number;
  quantity: number;
  lineCents: number;
  stock: number;
  /** Pocet byl snizen, protoze skladem je mene kusu, nez zakaznik chtel. */
  clamped: boolean;
}

export interface CartView {
  items: CartItemView[];
  /** Nejake radky zmizely (produkt vyprodan nebo stazen z prodeje). */
  droppedCount: number;
  subtotalCents: number;
}

/**
 * Zmeni cookie kosiku na zobrazitelny kosik: ceny a sklad se ctou z databaze,
 * ne z cookie. Radky, ktere uz nelze koupit, vynecha; pocty omezi skladem.
 * Nic nezapisuje — k zapisu dojde az pri objednavce, ktera si vse overi znovu.
 */
export async function resolveCart(lines: readonly CartLine[]): Promise<CartView> {
  if (lines.length === 0) return { items: [], droppedCount: 0, subtotalCents: 0 };

  const products = await prisma.product.findMany({
    where: { id: { in: lines.map((l) => l.productId) }, active: true },
    include: { category: { select: { slug: true } } },
  });
  const byId = new Map(products.map((p) => [p.id, p]));

  const items: CartItemView[] = [];
  let droppedCount = 0;

  for (const line of lines) {
    const p = byId.get(line.productId);
    if (!p || p.stock < 1) {
      droppedCount += 1;
      continue;
    }
    const quantity = Math.min(line.quantity, p.stock);
    items.push({
      productId: p.id,
      slug: p.slug,
      name: p.name,
      sku: p.sku,
      imageUrl: p.imageUrl,
      categorySlug: p.category.slug,
      unitCents: p.priceCents,
      quantity,
      lineCents: p.priceCents * quantity,
      stock: p.stock,
      clamped: quantity < line.quantity,
    });
  }

  return {
    items,
    droppedCount,
    subtotalCents: items.reduce((sum, i) => sum + i.lineCents, 0),
  };
}
