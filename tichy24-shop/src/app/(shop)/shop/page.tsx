import type { Metadata } from "next";
import Link from "next/link";
import { ProductCard } from "@/components/ProductCard";
import { getDictionary } from "@/lib/i18n";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const dict = await getDictionary();
  return { title: dict.shop.title, alternates: { canonical: "/shop" } };
}

type SearchParams = Promise<{ kategorie?: string; q?: string }>;

export default async function ShopPage({ searchParams }: { searchParams: SearchParams }) {
  const { kategorie, q } = await searchParams;
  const dict = await getDictionary();
  const s = dict.shop;
  // Hledany retezec jde do Prisma jako parametr (zadne skladani SQL), delka se jen omezi.
  const query = (q ?? "").trim().slice(0, 80);

  const categories = await prisma.category.findMany({ orderBy: { sortOrder: "asc" } });
  const active = categories.find((c) => c.slug === kategorie);

  const products = await prisma.product.findMany({
    where: {
      active: true,
      ...(active ? { categoryId: active.id } : {}),
      ...(query
        ? {
            OR: [
              { name: { contains: query, mode: "insensitive" } },
              { sku: { contains: query, mode: "insensitive" } },
              { summary: { contains: query, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    orderBy: [{ category: { sortOrder: "asc" } }, { name: "asc" }],
    include: { category: { select: { slug: true } } },
  });

  const filtered = Boolean(active || query);

  return (
    <div className="container">
      <h1>{active ? active.name : s.title}</h1>
      <p className="lead">{s.lead}</p>

      <div className="shop-layout">
        <aside className="sidebar" aria-label={s.categoriesLabel}>
          <h2>{s.categoriesLabel}</h2>
          <ul className="filter-list">
            <li>
              <Link href="/shop" aria-current={!active ? "true" : undefined}>{s.allCategories}</Link>
            </li>
            {categories.map((c) => (
              <li key={c.id}>
                <Link href={`/shop?kategorie=${c.slug}`} aria-current={active?.id === c.id ? "true" : undefined}>
                  {c.name}
                </Link>
              </li>
            ))}
          </ul>
        </aside>

        <section>
          <form className="search-form" action="/shop" role="search">
            {active && <input type="hidden" name="kategorie" value={active.slug} />}
            <label className="visually-hidden" htmlFor="q">{s.searchLabel}</label>
            <input id="q" type="search" name="q" defaultValue={query} placeholder={s.searchPlaceholder} maxLength={80} />
            <button className="btn" type="submit">{s.searchButton}</button>
          </form>

          <p className="result-count" aria-live="polite">{s.resultCount(products.length)}</p>

          {products.length === 0 ? (
            <div className="empty">
              <p>{s.noResults}</p>
              {filtered && <Link href="/shop">{s.resetFilters}</Link>}
            </div>
          ) : (
            <div className="product-grid">
              {products.map((p) => (
                <ProductCard key={p.id} product={p} dict={dict} />
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
