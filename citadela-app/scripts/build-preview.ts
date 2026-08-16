/**
 * Vygeneruje statické náhledy webu (citadela-nahled-cs.html a -en.html
 * v kořeni repozitáře) z běžícího serveru.
 *
 * K čemu to je: náhled se dá poslat e-mailem, otevřít bez Node.js a založit
 * do archivu — je to jediný soubor bez závislostí. Proto se do něj vkládají
 * styly i fotky (data: URI) a vyhazují skripty Next.js, které by beztak
 * neměly odkud načíst svoje chunky.
 *
 * Použití (server musí běžet):
 *   npx tsx scripts/build-preview.ts
 *   PREVIEW_BASE_URL=http://localhost:3001 npx tsx scripts/build-preview.ts
 */

import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

const BASE = process.env.PREVIEW_BASE_URL ?? "http://localhost:3000";
const ROOT = path.join(process.cwd(), "..");
const PUBLIC_DIR = path.join(process.cwd(), "public");

const MIME: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".svg": "image/svg+xml",
};

async function fetchText(url: string): Promise<string> {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`${url} → HTTP ${response.status}`);
  return response.text();
}

/** Obrázek z public/ jako data: URI. */
function inlineImage(src: string): string | null {
  const clean = src.split("?")[0];
  const file = path.join(PUBLIC_DIR, decodeURIComponent(clean));
  if (!file.startsWith(PUBLIC_DIR)) return null;
  try {
    const data = readFileSync(file);
    const mime = MIME[path.extname(file).toLowerCase()] ?? "application/octet-stream";
    return `data:${mime};base64,${data.toString("base64")}`;
  } catch {
    return null;
  }
}

/**
 * Písma z next/font leží v .next/static/media a CSS na ně odkazuje absolutní
 * cestou. V samostatném souboru by se nenačetla, takže je vložíme dovnitř —
 * jsou to jednotky desítek kilobajtů a bez nich náhled ztratí identitu.
 */
function inlineFonts(css: string): string {
  return css.replace(/url\((\/_next\/static\/media\/[^)]+\.woff2?)\)/g, (match, ref: string) => {
    const file = path.join(process.cwd(), ".next", ref.replace("/_next/", ""));
    try {
      const data = readFileSync(file);
      const format = file.endsWith(".woff2") ? "woff2" : "woff";
      return `url(data:font/${format};base64,${data.toString("base64")})`;
    } catch {
      return match;
    }
  });
}

async function buildPreview(locale: "cs" | "en"): Promise<void> {
  let html = await fetchText(`${BASE}/${locale}`);

  // 1. Styly: <link rel=stylesheet href="/_next/static/..."> -> <style>…</style>
  const styleHrefs = [...html.matchAll(/<link[^>]+rel="stylesheet"[^>]+href="([^"]+)"[^>]*>/g)];
  for (const [tag, href] of styleHrefs) {
    const css = await fetchText(href.startsWith("http") ? href : `${BASE}${href}`);
    html = html.replace(tag, `<style>${inlineFonts(css)}</style>`);
  }

  // Přednačítací odkazy míří na chunky, které v jednom souboru neexistují.
  html = html.replace(/<link[^>]+rel="(?:preload|prefetch|modulepreload)"[^>]*>/g, "");

  // srcset by tutéž fotku vložil dvacetkrát; v náhledu stačí jedna velikost.
  html = html.replace(/\s(?:srcSet|srcset|imageSrcSet|imagesrcset)="[^"]*"/g, "");

  // 2. Skripty Next.js by v samostatném souboru jen hlásily 404. Náhled je
  //    statický — server vykreslil všechno podstatné do HTML.
  html = html.replace(/<script[^>]*src="[^"]*"[^>]*><\/script>/g, "");
  html = html.replace(/<script[^>]*>[\s\S]*?<\/script>/g, "");

  // 3. Fotky: Next je servíruje přes /_next/image?url=…; vezmeme originál
  //    z public/ a vložíme ho rovnou do souboru.
  html = html.replace(/\/_next\/image\?url=([^"&]+)&[^"]*/g, (match, encoded: string) => {
    const original = decodeURIComponent(encoded);
    return inlineImage(original) ?? match;
  });
  html = html.replace(/(src|href)="(\/photos\/[^"]+)"/g, (match, attr: string, src: string) => {
    const inlined = inlineImage(src);
    return inlined ? `${attr}="${inlined}"` : match;
  });

  // 4. Odkazy mezi jazyky vedou na sousední soubor, ne na server.
  const other = locale === "cs" ? "en" : "cs";
  html = html.replace(new RegExp(`href="/${other}"`, "g"), `href="citadela-nahled-${other}.html"`);
  html = html.replace(new RegExp(`href="/${locale}"`, "g"), `href="#"`);

  const banner = `<!-- Statický náhled webu Citadela Resort (${locale}), vygenerováno ${new Date()
    .toISOString()
    .slice(0, 10)} skriptem citadela-app/scripts/build-preview.ts. Needitujte ručně. -->\n`;

  const target = path.join(ROOT, `citadela-nahled-${locale}.html`);
  writeFileSync(target, banner + html, "utf8");
  console.log(`${path.basename(target)}: ${(banner.length + html.length) / 1024 | 0} kB`);
}

async function main(): Promise<void> {
  for (const locale of ["cs", "en"] as const) {
    await buildPreview(locale);
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
