"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { addLine, removeLine, setLine } from "@/lib/cart";
import { readCart, writeCart } from "@/lib/cart-store";
import { validateCheckout, type CheckoutFormState } from "@/lib/checkout";
import { getDictionary } from "@/lib/i18n";
import {
  EmptyCartError,
  OutOfStockError,
  ProductUnavailableError,
  placeOrder,
} from "@/lib/orders";
import { prisma } from "@/lib/prisma";

/**
 * Server actions verejneho obchodu. Kazda z nich je verejne dosazitelny
 * POST endpoint, takze nic z formulare se nebere za bernou minci: id produktu
 * se overi v databazi, mnozstvi se orizne, ceny se nikdy neprijimaji.
 */

const quantitySchema = z.coerce.number().int().min(0).max(99);

export async function addToCartAction(formData: FormData): Promise<void> {
  const productId = String(formData.get("productId") ?? "");
  const quantity = quantitySchema.safeParse(formData.get("quantity") ?? 1);
  if (!productId || !quantity.success || quantity.data < 1) redirect("/warenkorb");

  const product = await prisma.product.findFirst({
    where: { id: productId, active: true, stock: { gt: 0 } },
    select: { id: true, stock: true },
  });
  if (!product) redirect("/warenkorb");

  // Do kosiku nejde vic kusu, nez je skladem — ani pri opakovanem pridani.
  const lines = await readCart();
  const have = lines.find((l) => l.productId === product.id)?.quantity ?? 0;
  const room = Math.max(0, product.stock - have);
  await writeCart(addLine(lines, product.id, Math.min(quantity.data, room)));
  redirect("/warenkorb");
}

export async function updateCartAction(formData: FormData): Promise<void> {
  const productId = String(formData.get("productId") ?? "");
  const quantity = quantitySchema.safeParse(formData.get("quantity"));
  if (productId && quantity.success) {
    await writeCart(setLine(await readCart(), productId, quantity.data));
  }
  redirect("/warenkorb");
}

export async function removeFromCartAction(formData: FormData): Promise<void> {
  const productId = String(formData.get("productId") ?? "");
  if (productId) await writeCart(removeLine(await readCart(), productId));
  redirect("/warenkorb");
}

/** Hodnoty, ktere se po chybe vraci do formulare. Heslo ani nic citliveho tu neni. */
const ECHO_FIELDS = [
  "name", "email", "phone", "deliveryMethod", "paymentMethod",
  "street", "postalCode", "city", "country", "note", "terms",
] as const;

export async function placeOrderAction(
  _prev: CheckoutFormState,
  formData: FormData,
): Promise<CheckoutFormState> {
  const dict = await getDictionary();
  const values: Record<string, string> = {};
  for (const key of ECHO_FIELDS) {
    const v = formData.get(key);
    if (typeof v === "string") values[key] = v;
  }

  // Honeypot: vyplnene pole znamena bota. Tvarime se, ze vse prislo v poradku —
  // chybova hlaska by botovi jen napovedela, co ho prozradilo.
  if (String(formData.get("website") ?? "") !== "") redirect("/");

  const checked = validateCheckout(formData);
  if (!checked.ok) {
    const errors: Record<string, string> = {};
    for (const [field, code] of Object.entries(checked.errors)) {
      errors[field] = dict.checkout.errors[code];
    }
    return { errors, values };
  }

  const lines = await readCart();
  let publicToken: string;
  try {
    const order = await placeOrder(checked.data, lines);
    publicToken = order.publicToken;
  } catch (err) {
    if (err instanceof EmptyCartError) redirect("/warenkorb");
    if (err instanceof OutOfStockError) {
      return { errors: {}, values, formError: dict.checkout.stockError(err.productName, err.available) };
    }
    if (err instanceof ProductUnavailableError) {
      return { errors: {}, values, formError: dict.checkout.unavailableError };
    }
    console.error("placeOrder selhal", err);
    return { errors: {}, values, formError: dict.checkout.genericError };
  }

  // Cookie se maze az po uspesnem ulozeni, aby pri chybe zakaznik o kosik neprisel.
  await writeCart([]);
  redirect(`/bestellung/${publicToken}`);
}
