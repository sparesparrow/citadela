import type { MetadataRoute } from "next";
import { prisma } from "@/lib/prisma";
import { site } from "@/lib/site";

// Sitemap cte katalog z databaze — nesmi se predrenderovat pri buildu.
export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const products = await prisma.product.findMany({
    where: { active: true },
    select: { slug: true, updatedAt: true },
  });
  const staticPages = ["", "/shop", "/versand-zahlung", "/kontakt", "/impressum", "/agb", "/datenschutz"];
  return [
    ...staticPages.map((p) => ({ url: `${site.url}${p}` })),
    ...products.map((p) => ({ url: `${site.url}/produkt/${p.slug}`, lastModified: p.updatedAt })),
  ];
}
