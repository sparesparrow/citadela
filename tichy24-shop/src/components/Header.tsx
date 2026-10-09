import Link from "next/link";
import { Brand } from "@/components/Brand";
import { countItems } from "@/lib/cart";
import { readCart } from "@/lib/cart-store";
import type { Dictionary } from "@/dictionaries/de";

export async function Header({ nav }: { nav: Dictionary["nav"] }) {
  const count = countItems(await readCart());

  return (
    <header className="site-header">
      <div className="container header-inner">
        <Brand />
        {/* <details> statt JS: das Menü funktioniert auch ohne Skript. */}
        <details className="menu-toggle">
          <summary>{nav.menu}</summary>
        </details>
        <nav className="nav" aria-label="Hauptnavigation">
          <Link href="/shop">{nav.shop}</Link>
          <Link href="/versand-zahlung">{nav.shipping}</Link>
          <Link href="/kontakt">{nav.contact}</Link>
          <Link className="cart-link" href="/warenkorb">
            {nav.cart}
            {count > 0 && (
              <span className="cart-count" aria-label={nav.cartCount(count)}>
                {count}
              </span>
            )}
          </Link>
        </nav>
      </div>
    </header>
  );
}
