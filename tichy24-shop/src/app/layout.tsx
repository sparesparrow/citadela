import type { Metadata, Viewport } from "next";
import { isLive, site } from "@/lib/site";
import { getDictionary } from "@/lib/i18n";
import "./globals.css";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#0b6bcb",
};

export async function generateMetadata(): Promise<Metadata> {
  const dict = await getDictionary();
  return {
    metadataBase: new URL(site.url),
    title: { default: dict.meta.title, template: `%s | ${site.name}` },
    description: dict.meta.description,
    openGraph: {
      type: "website",
      locale: "de_CH",
      siteName: site.name,
      title: dict.meta.title,
      description: dict.meta.description,
    },
    // Solange SHOP_LIVE nicht gesetzt ist, soll keine Suchmaschine Platzhalter-Daten indexieren.
    robots: isLive() ? { index: true, follow: true } : { index: false, follow: false },
  };
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="de-CH">
      <body>{children}</body>
    </html>
  );
}
