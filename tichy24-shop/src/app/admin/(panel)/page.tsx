import Link from "next/link";
import { formatDateTime, getDictionary } from "@/lib/i18n";
import { formatChf } from "@/lib/money";
import { prisma } from "@/lib/prisma";
import { formatOrderNumber } from "@/lib/site";

export default async function AdminOrdersPage() {
  const dict = await getDictionary();
  const a = dict.admin.orders;
  const [orders, open] = await Promise.all([
    prisma.order.findMany({ orderBy: { createdAt: "desc" }, take: 100 }),
    prisma.order.count({ where: { status: { in: ["NEW", "PAID"] } } }),
  ]);

  return (
    <>
      <div className="admin-head">
        <h1>{a.title}</h1>
        <span className="meta">{a.openCount(open)}</span>
      </div>

      {orders.length === 0 ? (
        <div className="empty">{a.empty}</div>
      ) : (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>{a.number}</th>
                <th>{a.date}</th>
                <th>{a.customer}</th>
                <th>{a.delivery}</th>
                <th>{a.payment}</th>
                <th className="num">{a.total}</th>
                <th>{a.status}</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((o) => (
                <tr key={o.id}>
                  <td><Link className="mono" href={`/admin/bestellungen/${o.id}`}>{formatOrderNumber(o.number)}</Link></td>
                  <td>{formatDateTime(o.createdAt)}</td>
                  <td>{o.name}</td>
                  <td>{a.deliveryLabel[o.deliveryMethod]}</td>
                  <td>{a.paymentLabel[o.paymentMethod]}</td>
                  <td className="num">{formatChf(o.totalCents)}</td>
                  <td><span className={`pill pill-${o.status}`}>{dict.order.status[o.status]}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
