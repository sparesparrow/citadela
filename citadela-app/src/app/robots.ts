import type { MetadataRoute } from "next";

// Mimo [locale]: middleware .txt nepresmerovava, takze /robots.txt obslouzi primo tato routa.
// Admin, prihlaseni a API nemaji co delat ve vysledcich vyhledavani.
export default function robots(): MetadataRoute.Robots {
  const base = process.env.AUTH_URL ?? "http://localhost:3000";
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/api/", "/cs/admin", "/en/admin", "/cs/login", "/en/login"] },
    sitemap: `${base}/sitemap.xml`,
  };
}
