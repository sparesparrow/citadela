import type { Metadata } from "next";
import Link from "next/link";
import { removeFromCartAction, updateCartAction } from "@/app/actions";
import { ProductImage } from "@/components/ProductImage";
import { readCart } from "@/lib/cart-store";
import { resolveCart } from "@/lib/cart-view";
import { getDictionary } from "@/lib/i18n";
import { formatChf } from "@/lib/money";
import { SHIPPING, VAT_RATE_BP, vatIncluded } from "@/lib/pricing";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const dict = await getDictionary();
  return { title: dict.cart.title, robots: { index: false, follow: false } };
}

export default async function CartPage() {
  const dict = await getDictionary();
  const c = dict.cart;
  const cart = await resolveCart(await readCart());
  const clamped = cart.items.some((i) => i.clamped);
  const missingForFree = Math.max(0, SHIPPING.freeFromCents - cart.subtotalCents);

  return (
    <div className="container">
      <h1>{c.title}</h1>

      {cart.droppedCount > 0 && <div className="notice notice-warn" role="status">{c.dropped}</div>}
      {clamped && <div className="notice notice-warn" role="status">{c.clamped}</div>}

      {cart.items.length === 0 ? (
        <div className="empty">
          <p>{c.empty}</p>
          <Link className="btn" href="/shop">{c.emptyCta}</Link>
        </div>
      ) : (
        <div className="cart-layout">
          <ul className="cart-items">
            {cart.items.map((i) => (
              <li className="cart-item" key={i.productId}>
                <div className="cart-thumb product-media">
                  <ProductImage imageUrl={i.imageUrl} categorySlug={i.categorySlug} name={i.name} dict={dict.product} />
                </div>
                <div>
                  <h3><Link href={`/produkt/${i.slug}`}>{i.name}</Link></h3>
                  <div className="meta">{formatChf(i.unitCents)}</div>
                  <div className="cart-controls">
                    <form action={updateCartAction} className="cart-controls">
                      <input type="hidden" name="productId" value={i.productId} />
                      <label className="visually-hidden" htmlFor={`q-${i.productId}`}>{c.quantity}</label>
                      <input id={`q-${i.productId}`} name="quantity" type="number" min={1} max={Math.min(99, i.stock)} defaultValue={i.quantity} inputMode="numeric" />
                      <button className="btn btn-ghost btn-sm" type="submit">{c.update}</button>
                    </form>
                    <form action={removeFromCartAction}>
                      <input type="hidden" name="productId" value={i.productId} />
                      <button className="btn-link" type="submit" aria-label={c.removeLabel(i.name)}>{c.remove}</button>
                    </form>
                  </div>
                </div>
                <div className="line-total">{formatChf(i.lineCents)}</div>
              </li>
            ))}
          </ul>

          <aside className="summary-card" aria-labelledby="cart-sum">
            <h2 id="cart-sum">{c.total}</h2>
            <div className="summary-row"><span>{c.subtotal}</span><span>{formatChf(cart.subtotalCents)}</span></div>
            <div className="summary-row muted"><span>{c.shipping}</span><span>{c.shippingEstimate}</span></div>
            {missingForFree > 0 && <p className="meta">{c.freeShippingHint(missingForFree)}</p>}
            {VAT_RATE_BP > 0 && (
              <div className="summary-row muted">
                <span>{dict.common.vatLabel}</span>
                <span>{formatChf(vatIncluded(cart.subtotalCents))}</span>
              </div>
            )}
            <Link className="btn" href="/kasse">{c.checkout}</Link>
            <p style={{ textAlign: "center", marginTop: 12, marginBottom: 0 }}>
              <Link href="/shop">{c.continueShopping}</Link>
            </p>
          </aside>
        </div>
      )}
    </div>
  );
}
