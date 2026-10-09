import type { MetadataRoute } from "next";
import { isLive, site } from "@/lib/site";

export default function robots(): MetadataRoute.Robots {
  // Pred spustenim (SHOP_LIVE != 1) nechceme, aby vyhledavac cetl zastupne udaje.
  if (!isLive()) return { rules: { userAgent: "*", disallow: "/" } };
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/admin", "/kasse", "/warenkorb", "/bestellung", "/api"] },
    sitemap: `${site.url}/sitemap.xml`,
  };
}
