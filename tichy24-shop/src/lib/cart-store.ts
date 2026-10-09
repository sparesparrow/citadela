import "server-only";
import { cookies } from "next/headers";
import { CART_COOKIE, parseCart, serializeCart, type CartLine } from "./cart";

/** Cteni a zapis cookie kosiku. Zapisovat lze jen v server action / route handleru. */
export async function readCart(): Promise<CartLine[]> {
  const jar = await cookies();
  return parseCart(jar.get(CART_COOKIE)?.value);
}

export async function writeCart(lines: readonly CartLine[]): Promise<void> {
  const jar = await cookies();
  if (lines.length === 0) {
    jar.delete(CART_COOKIE);
    return;
  }
  jar.set(CART_COOKIE, serializeCart(lines), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
}
