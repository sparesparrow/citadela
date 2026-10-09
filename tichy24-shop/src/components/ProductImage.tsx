import type { Dictionary } from "@/dictionaries/de";

/**
 * Obrazek produktu. Dokud produkt nema vlastni fotku, ukaze se piktogram
 * podle kategorie — prazdna sedá plocha by vypadala jako chyba.
 */
const GLYPHS: Record<string, string> = {
  // klic (Werkzeug)
  werkzeug:
    "M21.7 6.3a5 5 0 0 1-6.6 6.6L7 21a2.1 2.1 0 0 1-3-3l8.1-8.1a5 5 0 0 1 6.6-6.6L14.5 6.5l3 3z",
  // ozubene kolo (Ersatzteile)
  ersatzteile:
    "M12 8.5a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7zM10.5 2h3l.5 2.6 1.9.8 2.2-1.5 2.1 2.1-1.5 2.2.8 1.9L22 10.5v3l-2.6.5-.8 1.9 1.5 2.2-2.1 2.1-2.2-1.5-1.9.8-.5 2.6h-3l-.5-2.6-1.9-.8-2.2 1.5-2.1-2.1 1.5-2.2-.8-1.9L2 13.5v-3l2.6-.5.8-1.9-1.5-2.2 2.1-2.1 2.2 1.5 1.9-.8z",
  // kapka (Pflege & Schmierstoffe)
  pflege: "M12 2.5s6 6.2 6 11a6 6 0 0 1-12 0c0-4.8 6-11 6-11z",
  // krabice (Zubehör)
  zubehoer: "M3 7.5 12 3l9 4.5v9L12 21l-9-4.5zM3 7.5l9 4.5 9-4.5M12 12v9",
};
const FALLBACK = GLYPHS.werkzeug;

export function ProductImage({
  imageUrl,
  categorySlug,
  name,
  dict,
}: {
  imageUrl: string | null;
  categorySlug: string;
  name: string;
  dict: Dictionary["product"];
}) {
  if (imageUrl) {
    // Bewusst <img>: Bild-Hosts sind frei wählbar, next/image bräuchte eine feste Allowlist.
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={imageUrl} alt={dict.imageOf(name)} loading="lazy" decoding="async" />;
  }
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.3"
      strokeLinecap="round"
      strokeLinejoin="round"
      role="img"
      aria-label={dict.placeholderImage}
    >
      <path d={GLYPHS[categorySlug] ?? FALLBACK} />
    </svg>
  );
}
