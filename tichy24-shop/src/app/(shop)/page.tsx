import Link from "next/link";
import { ProductCard } from "@/components/ProductCard";
import { getDictionary } from "@/lib/i18n";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const dict = await getDictionary();
  const [categories, featured] = await Promise.all([
    prisma.category.findMany({
      orderBy: { sortOrder: "asc" },
      include: { _count: { select: { products: { where: { active: true } } } } },
    }),
    prisma.product.findMany({
      where: { active: true, stock: { gt: 0 } },
      orderBy: { createdAt: "desc" },
      take: 4,
      include: { category: { select: { slug: true } } },
    }),
  ]);
  const h = dict.home;

  return (
    <>
      <section className="hero">
        <div className="container">
          <div className="hero-inner">
            <p className="eyebrow">{h.hero.eyebrow}</p>
            <h1>{h.hero.title}</h1>
            <p className="lead">{h.hero.lead}</p>
            <div className="hero-actions">
              <Link className="btn" href="/shop">{h.hero.cta}</Link>
              <Link className="btn btn-ghost" href="/versand-zahlung">{h.hero.ctaSecondary}</Link>
            </div>
          </div>
        </div>
      </section>

      <div className="container">
        <section className="section" aria-label="Vorteile">
          <div className="usp-grid">
            {h.usps.map((u) => (
              <div className="usp" key={u.title}>
                <h3>{u.title}</h3>
                <p>{u.text}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="section">
          <div className="section-head"><h2>{h.categoriesHeading}</h2></div>
          <div className="cat-grid">
            {categories.map((c) => (
              <Link className="cat-tile" key={c.id} href={`/shop?kategorie=${c.slug}`}>
                {c.name}
                <span>{dict.shop.resultCount(c._count.products)}</span>
              </Link>
            ))}
          </div>
        </section>

        {featured.length > 0 && (
          <section className="section">
            <div className="section-head">
              <h2>{h.featuredHeading}</h2>
              <Link href="/shop">{h.allProducts}</Link>
            </div>
            <div className="product-grid">
              {featured.map((p) => (
                <ProductCard key={p.id} product={p} dict={dict} />
              ))}
            </div>
          </section>
        )}
      </div>
    </>
  );
}
