import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { addToCartAction } from "@/app/actions";
import { ProductImage } from "@/components/ProductImage";
import { StockLabel } from "@/components/ProductCard";
import { formatChf } from "@/lib/money";
import { getDictionary } from "@/lib/i18n";
import { prisma } from "@/lib/prisma";
import { site } from "@/lib/site";
import { VAT_RATE_BP } from "@/lib/pricing";

export const dynamic = "force-dynamic";

type Params = Promise<{ slug: string }>;

async function loadProduct(slug: string) {
  return prisma.product.findFirst({
    where: { slug, active: true },
    include: { category: true },
  });
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { slug } = await params;
  const product = await loadProduct(slug);
  if (!product) return {};
  return {
    title: product.name,
    description: product.summary,
    alternates: { canonical: `/produkt/${product.slug}` },
    openGraph: { title: product.name, description: product.summary, images: product.imageUrl ? [product.imageUrl] : undefined },
  };
}

export default async function ProductPage({ params }: { params: Params }) {
  const { slug } = await params;
  const product = await loadProduct(slug);
  if (!product) notFound();

  const dict = await getDictionary();
  const d = dict.product;
  const soldOut = product.stock < 1;

  // Strukturierte Daten für Suchmaschinen (Preis und Verfügbarkeit).
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    sku: product.sku,
    description: product.summary,
    image: product.imageUrl ?? undefined,
    offers: {
      "@type": "Offer",
      url: `${site.url}/produkt/${product.slug}`,
      priceCurrency: "CHF",
      price: (product.priceCents / 100).toFixed(2),
      availability: soldOut ? "https://schema.org/OutOfStock" : "https://schema.org/InStock",
      seller: { "@type": "Organization", name: site.name },
    },
  };

  return (
    <div className="container">
      <nav className="breadcrumb" aria-label="Brotkrümel">
        <Link href="/shop">{d.breadcrumbShop}</Link> /{" "}
        <Link href={`/shop?kategorie=${product.category.slug}`}>{product.category.name}</Link>
      </nav>

      <div className="product-page">
        <div className="product-media">
          <ProductImage imageUrl={product.imageUrl} categorySlug={product.category.slug} name={product.name} dict={d} />
        </div>

        <div>
          <h1>{product.name}</h1>
          <p className="lead">{product.summary}</p>

          <div className="buy-box">
            <div className="price">
              {formatChf(product.priceCents)}{" "}
              {VAT_RATE_BP > 0 && <span className="price-note">{dict.common.vatIncluded}</span>}
            </div>
            <StockLabel stock={product.stock} dict={d} />

            {!soldOut && (
              <form action={addToCartAction}>
                <input type="hidden" name="productId" value={product.id} />
                <div className="buy-row">
                  <div>
                    <label htmlFor="quantity">{d.quantity}</label>
                    <input
                      className="qty-input"
                      id="quantity"
                      name="quantity"
                      type="number"
                      min={1}
                      max={Math.min(99, product.stock)}
                      defaultValue={1}
                      inputMode="numeric"
                    />
                  </div>
                  <button className="btn" type="submit">{d.addToCart}</button>
                </div>
              </form>
            )}
            <p className="meta" style={{ marginTop: 12, marginBottom: 0 }}>{d.shippingNote}</p>
          </div>

          <div className="prose">
            <h2>{d.description}</h2>
            {product.description.split(/\n{2,}/).map((para, i) => (
              <p className="pre" key={i}>{para}</p>
            ))}
            <p className="meta">{d.sku}: <span className="mono">{product.sku}</span></p>
          </div>
        </div>
      </div>

      {/* eslint-disable-next-line react/no-danger -- JSON.stringify eigener, vertrauenswürdiger DB-Daten; "<" wird maskiert */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
    </div>
  );
}
