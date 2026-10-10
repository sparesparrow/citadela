import type { MetadataRoute } from "next";
import { locales } from "@/lib/i18n";

// Verejne jsou jen dve jazykove verze titulni stranky; kazda odkazuje na tu druhou,
// aby vyhledavac nepovazoval ceskou a anglickou verzi za duplicitu.
export default function sitemap(): MetadataRoute.Sitemap {
  const base = process.env.AUTH_URL ?? "http://localhost:3000";
  const languages = Object.fromEntries(locales.map((l) => [l, `${base}/${l}`]));
  return locales.map((locale) => ({
    url: `${base}/${locale}`,
    changeFrequency: "monthly",
    priority: locale === "cs" ? 1 : 0.9,
    alternates: { languages },
  }));
}
