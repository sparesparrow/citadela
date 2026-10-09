import Link from "next/link";
import { Brand } from "@/components/Brand";
import { site } from "@/lib/site";
import type { Dictionary } from "@/dictionaries/de";

export function Footer({ dict }: { dict: Dictionary }) {
  const f = dict.footer;
  return (
    <footer className="site-footer">
      <div className="container">
        <div className="footer-grid">
          <div>
            <Brand />
            <p style={{ marginTop: 12 }}>
              {site.tagline}
              <br />
              {site.contact.email}
            </p>
          </div>
          <div>
            <h2>{f.shop}</h2>
            <ul>
              <li><Link href="/shop">{dict.nav.shop}</Link></li>
              <li><Link href="/warenkorb">{dict.nav.cart}</Link></li>
              <li><Link href="/versand-zahlung">{f.shipping}</Link></li>
            </ul>
          </div>
          <div>
            <h2>{f.info}</h2>
            <ul>
              <li><Link href="/kontakt">{f.contact}</Link></li>
              <li><Link href="/impressum">{f.impressum}</Link></li>
              <li><Link href="/agb">{f.agb}</Link></li>
              <li><Link href="/datenschutz">{f.privacy}</Link></li>
            </ul>
          </div>
        </div>
        <div className="footer-bottom">
          <span>{f.rights(new Date().getFullYear())}</span>
          <span>{f.swissNote} · {dict.common.currencyNote}</span>
        </div>
      </div>
    </footer>
  );
}
