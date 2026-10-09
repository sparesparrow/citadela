import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { formatDateTime, getDictionary } from "@/lib/i18n";
import { formatChf } from "@/lib/money";
import { prisma } from "@/lib/prisma";
import { formatOrderNumber, site } from "@/lib/site";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { robots: { index: false, follow: false } };

export default async function OrderPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  // Token ist zufällig (siehe orders.ts) — die Bestellnummer allein öffnet die Seite nicht.
  const order = await prisma.order.findUnique({
    where: { publicToken: token },
    include: { items: true },
  });
  if (!order) notFound();

  const dict = await getDictionary();
  const o = dict.order;
  const number = formatOrderNumber(order.number);

  return (
    <div className="container" style={{ maxWidth: 760 }}>
      <h1>{o.thanks}</h1>
      <div className="order-box">
        <dl className="kv">
          <dt>{o.number}</dt>
          <dd className="order-number">{number}</dd>
          <dt>{o.statusLabel}</dt>
          <dd><span className={`pill pill-${order.status}`}>{o.status[order.status]}</span></dd>
          <dt>{dict.admin.orders.date}</dt>
          <dd>{formatDateTime(order.createdAt)}</dd>
        </dl>
        <p className="meta" style={{ marginTop: 12, marginBottom: 0 }}>{o.keepLink}</p>
      </div>

      {order.status === "NEW" && order.paymentMethod === "PREPAYMENT" && (
        <div className="order-box">
          <h2>{o.prepayment.heading}</h2>
          <p>{o.prepayment.intro}</p>
          <dl className="kv">
            <dt>{o.prepayment.amount}</dt>
            <dd>{formatChf(order.totalCents)}</dd>
            <dt>{o.prepayment.holder}</dt>
            <dd>{site.bank.holder}</dd>
            <dt>{o.prepayment.iban}</dt>
            <dd className={site.bank.iban ? "mono" : undefined}>{site.bank.iban || o.prepayment.ibanMissing}</dd>
            <dt>{o.prepayment.reference}</dt>
            <dd className="mono">{number}</dd>
          </dl>
        </div>
      )}

      {order.status === "NEW" && order.paymentMethod === "CASH_ON_PICKUP" && (
        <div className="order-box">
          <h2>{o.cash.heading}</h2>
          <p style={{ marginBottom: 0 }}>{o.cash.text}</p>
        </div>
      )}

      <div className="order-box">
        <h2>{o.items}</h2>
        <ul className="summary-items">
          {order.items.map((i) => (
            <li key={i.id}>
              <span>{i.quantity} × {i.name}</span>
              <span>{formatChf(i.unitCents * i.quantity)}</span>
            </li>
          ))}
        </ul>
        <div className="summary-row"><span>{dict.cart.subtotal}</span><span>{formatChf(order.subtotalCents)}</span></div>
        <div className="summary-row">
          <span>{dict.cart.shipping}</span>
          <span>{order.shippingCents === 0 ? dict.cart.shippingFree : formatChf(order.shippingCents)}</span>
        </div>
        <div className="summary-row summary-total"><span>{dict.cart.total}</span><span>{formatChf(order.totalCents)}</span></div>
        {order.vatRateBp > 0 && (
          <div className="summary-row muted">
            <span>{dict.common.vatLabelFor(order.vatRateBp)}</span>
            <span>{formatChf(order.vatCents)}</span>
          </div>
        )}
      </div>

      <div className="order-box">
        <h2>{order.deliveryMethod === "SHIPPING" ? o.shippingTo : o.pickupAt}</h2>
        <p style={{ whiteSpace: "pre-line", marginBottom: 0 }}>
          {order.name}
          {order.deliveryMethod === "SHIPPING" &&
            `\n${order.street}\n${order.postalCode} ${order.city}\n${order.country === "LI" ? dict.checkout.countries.LI : dict.checkout.countries.CH}`}
        </p>
      </div>

      <p>
        {o.contactUs} <a href={`mailto:${site.contact.email}`}>{site.contact.email}</a>
      </p>
      <Link className="btn btn-ghost" href="/shop">{dict.cart.continueShopping}</Link>
    </div>
  );
}
