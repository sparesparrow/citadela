import Link from "next/link";
import { stockLevel } from "@/lib/catalog";
import { getDictionary } from "@/lib/i18n";
import { formatChf } from "@/lib/money";
import { prisma } from "@/lib/prisma";

export default async function AdminProductsPage() {
  const dict = await getDictionary();
  const p = dict.admin.products;
  const products = await prisma.product.findMany({
    orderBy: [{ category: { sortOrder: "asc" } }, { name: "asc" }],
    include: { category: true },
  });

  return (
    <>
      <div className="admin-head">
        <h1>{p.title}</h1>
        <Link className="btn" href="/admin/produkte/neu">{p.new}</Link>
      </div>

      {products.length === 0 ? (
        <div className="empty">{p.empty}</div>
      ) : (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>{p.sku}</th>
                <th>{p.name}</th>
                <th>{p.category}</th>
                <th className="num">{p.price}</th>
                <th className="num">{p.stock}</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {products.map((x) => (
                <tr key={x.id} style={x.active ? undefined : { opacity: 0.55 }}>
                  <td className="mono">{x.sku}</td>
                  <td>
                    {x.name} {!x.active && <span className="pill pill-CANCELLED">{p.inactive}</span>}
                  </td>
                  <td>{x.category.name}</td>
                  <td className="num">{formatChf(x.priceCents)}</td>
                  <td className="num">
                    {x.stock}{" "}
                    {x.active && stockLevel(x.stock) !== "in" && <span className="pill pill-NEW">{p.lowStock}</span>}
                  </td>
                  <td><Link href={`/admin/produkte/${x.id}`}>{p.edit}</Link></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
