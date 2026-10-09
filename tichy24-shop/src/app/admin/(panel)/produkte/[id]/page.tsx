import Link from "next/link";
import { notFound } from "next/navigation";
import { ProductForm, type ProductFormLabels } from "@/components/ProductForm";
import { getDictionary } from "@/lib/i18n";
import { centsToInput } from "@/lib/money";
import { prisma } from "@/lib/prisma";

export default async function AdminProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const isNew = id === "neu";

  const [product, categories, dict] = await Promise.all([
    isNew ? Promise.resolve(null) : prisma.product.findUnique({ where: { id } }),
    prisma.category.findMany({ orderBy: { sortOrder: "asc" } }),
    getDictionary(),
  ]);
  if (!isNew && !product) notFound();

  const p = dict.admin.products;
  const labels: ProductFormLabels = {
    name: p.name, sku: p.sku, category: p.category, price: p.price, stock: p.stock,
    active: p.active, slug: p.slug, slugHint: p.slugHint, summary: p.summary,
    description: p.description, descriptionHint: p.descriptionHint, imageUrl: p.imageUrl,
    save: p.save, saved: p.saved,
  };

  return (
    <>
      <div className="admin-head">
        <h1>{product ? product.name : p.new}</h1>
        <Link href="/admin/produkte">{dict.common.back}</Link>
      </div>
      <ProductForm
        productId={product?.id ?? null}
        labels={labels}
        categories={categories.map((c) => ({ id: c.id, name: c.name }))}
        initial={{
          name: product?.name ?? "",
          sku: product?.sku ?? "",
          slug: product?.slug ?? "",
          summary: product?.summary ?? "",
          description: product?.description ?? "",
          price: product ? centsToInput(product.priceCents) : "",
          stock: String(product?.stock ?? 0),
          categoryId: product?.categoryId ?? categories[0]?.id ?? "",
          imageUrl: product?.imageUrl ?? "",
          active: product ? (product.active ? "on" : "") : "on",
        }}
      />
    </>
  );
}
