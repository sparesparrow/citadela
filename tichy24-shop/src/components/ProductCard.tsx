import Link from "next/link";
import { ProductImage } from "@/components/ProductImage";
import { stockLevel } from "@/lib/catalog";
import { formatChf } from "@/lib/money";
import type { Dictionary } from "@/dictionaries/de";

export interface ProductCardData {
  slug: string;
  name: string;
  summary: string;
  priceCents: number;
  stock: number;
  imageUrl: string | null;
  category: { slug: string };
}

export function StockLabel({ stock, dict }: { stock: number; dict: Dictionary["product"] }) {
  const level = stockLevel(stock);
  if (level === "out") return <span className="stock stock-out">{dict.soldOut}</span>;
  if (level === "low") return <span className="stock stock-low">{dict.lowStock(stock)}</span>;
  return <span className="stock stock-ok">{dict.inStock}</span>;
}

export function ProductCard({ product, dict }: { product: ProductCardData; dict: Dictionary }) {
  return (
    <Link className="product-card" href={`/produkt/${product.slug}`}>
      <div className="product-media">
        <ProductImage
          imageUrl={product.imageUrl}
          categorySlug={product.category.slug}
          name={product.name}
          dict={dict.product}
        />
      </div>
      <div className="product-body">
        <h3 className="product-name">{product.name}</h3>
        <p className="product-summary">{product.summary}</p>
        <div className="price">{formatChf(product.priceCents)}</div>
        <StockLabel stock={product.stock} dict={dict.product} />
      </div>
    </Link>
  );
}
