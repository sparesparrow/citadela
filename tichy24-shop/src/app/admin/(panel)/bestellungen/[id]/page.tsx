import Link from "next/link";
import { notFound } from "next/navigation";
import { changeStatusAction } from "@/app/admin/actions";
import { ConfirmButton } from "@/components/ConfirmButton";
import { formatDateTime, getDictionary } from "@/lib/i18n";
import { formatChf } from "@/lib/money";
import { allowedTransitions } from "@/lib/order-status";
import { prisma } from "@/lib/prisma";
import { formatOrderNumber } from "@/lib/site";

export default async function AdminOrderPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const [{ id }, { error }] = await Promise.all([params, searchParams]);
  const order = await prisma.order.findUnique({ where: { id }, include: { items: true } });
  if (!order) notFound();

  const dict = await getDictionary();
  const a = dict.admin.orders;
  const actions = allowedTransitions(order.status, order.paymentMethod);
  const countries = dict.checkout.countries;

  return (
    <>
      <div className="admin-head">
        <h1>
          <span className="mono">{formatOrderNumber(order.number)}</span>{" "}
          <span className={`pill pill-${order.status}`}>{dict.order.status[order.status]}</span>
        </h1>
        <Link href="/admin">{dict.common.back}</Link>
      </div>

      {error && <div className="notice notice-error" role="alert">{a.changeFailed}</div>}

      <div className="admin-grid">
        <div>
          <div className="order-box">
            <h2>{a.items}</h2>
            <ul className="summary-items">
              {order.items.map((i) => (
                <li key={i.id}>
                  <span>{i.quantity} × {i.name} <span className="mono meta">{i.sku}</span></span>
                  <span>{formatChf(i.unitCents * i.quantity)}</span>
                </li>
              ))}
            </ul>
            <div className="summary-row"><span>{dict.cart.subtotal}</span><span>{formatChf(order.subtotalCents)}</span></div>
            <div className="summary-row"><span>{dict.cart.shipping}</span><span>{formatChf(order.shippingCents)}</span></div>
            <div className="summary-row summary-total"><span>{a.total}</span><span>{formatChf(order.totalCents)}</span></div>
            {order.vatRateBp > 0 && (
              <div className="summary-row muted"><span>{dict.common.vatLabelFor(order.vatRateBp)}</span><span>{formatChf(order.vatCents)}</span></div>
            )}
          </div>

          <div className="order-box">
            <h2>{a.customer}</h2>
            <dl className="kv">
              <dt>{dict.checkout.name}</dt><dd>{order.name}</dd>
              <dt>{dict.checkout.email}</dt><dd><a href={`mailto:${order.email}`}>{order.email}</a></dd>
              {order.phone && (<><dt>{dict.checkout.phone}</dt><dd>{order.phone}</dd></>)}
              <dt>{a.delivery}</dt><dd>{a.deliveryLabel[order.deliveryMethod]}</dd>
              <dt>{a.payment}</dt><dd>{a.paymentLabel[order.paymentMethod]}</dd>
              {order.deliveryMethod === "SHIPPING" && (
                <>
                  <dt>{a.address}</dt>
                  <dd style={{ whiteSpace: "pre-line" }}>
                    {`${order.street}\n${order.postalCode} ${order.city}\n${order.country === "LI" ? countries.LI : countries.CH}`}
                  </dd>
                </>
              )}
              {order.note && (<><dt>{a.note}</dt><dd style={{ whiteSpace: "pre-line" }}>{order.note}</dd></>)}
            </dl>
          </div>
        </div>

        <aside>
          <div className="order-box">
            <h2>{a.actions}</h2>
            {actions.length === 0 ? (
              <p className="meta" style={{ marginBottom: 0 }}>{a.noActions}</p>
            ) : (
              <div className="action-list">
                {actions.map((to) => (
                  <form action={changeStatusAction} key={to}>
                    <input type="hidden" name="orderId" value={order.id} />
                    <input type="hidden" name="to" value={to} />
                    {to === "CANCELLED" ? (
                      <ConfirmButton className="btn btn-danger" message={a.cancelConfirm}>{a.action.CANCELLED}</ConfirmButton>
                    ) : (
                      <button className="btn" type="submit">{a.action[to as "PAID" | "FULFILLED"]}</button>
                    )}
                  </form>
                ))}
              </div>
            )}
          </div>

          <div className="order-box">
            <h2>{a.timeline}</h2>
            <dl className="kv">
              <dt>{a.created}</dt><dd>{formatDateTime(order.createdAt)}</dd>
              {order.paidAt && (<><dt>{a.paidAt}</dt><dd>{formatDateTime(order.paidAt)}</dd></>)}
              {order.fulfilledAt && (<><dt>{a.fulfilledAt}</dt><dd>{formatDateTime(order.fulfilledAt)}</dd></>)}
              {order.cancelledAt && (<><dt>{a.cancelledAt}</dt><dd>{formatDateTime(order.cancelledAt)}</dd></>)}
            </dl>
          </div>
        </aside>
      </div>
    </>
  );
}
