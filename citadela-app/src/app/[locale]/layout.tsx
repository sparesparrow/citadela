import type { Metadata } from "next";
import { Playfair_Display, Italiana, Jost, JetBrains_Mono } from "next/font/google";
import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { getDictionary, isLocale, locales, type Locale } from "@/lib/i18n";
import { bookingUrl } from "@/lib/booking";
import { site } from "@/lib/site";
import { Header } from "@/components/Header";
import { RevealFallback } from "@/components/RevealFallback";
import "../globals.css";

const playfair = Playfair_Display({
  subsets: ["latin", "latin-ext"],
  weight: ["400", "500", "600"],
  style: ["normal", "italic"],
  display: "swap",
  variable: "--font-serif",
});
// Italiana existuje jen v podmnozine "latin". Nevadi — pouziva se
// vyhradne na logotyp "Citadela", ktery diakritiku nema. Texty
// s diakritikou bezi v Playfair / Jost, kde latin-ext je.
const italiana = Italiana({
  subsets: ["latin"],
  weight: "400",
  display: "swap",
  variable: "--font-logo",
});
const jost = Jost({
  subsets: ["latin", "latin-ext"],
  weight: ["300", "400", "500"],
  display: "swap",
  variable: "--font-sans",
});
// Technicky hlas: ceny, data, kody karet, casy v auditu. Drzi cislice
// v tabulkach zarovnane pod sebou, coz Jost neumi.
const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin", "latin-ext"],
  weight: ["400", "500"],
  display: "swap",
  variable: "--font-mono",
});

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const dict = await getDictionary(locale);

  return {
    title: dict.meta.title,
    description: dict.meta.description,
    metadataBase: new URL(process.env.AUTH_URL ?? "http://localhost:3000"),
    alternates: {
      canonical: `/${locale}`,
      languages: { cs: "/cs", en: "/en", "x-default": "/cs" },
    },
    openGraph: {
      type: "website",
      locale: locale === "cs" ? "cs_CZ" : "en_GB",
      alternateLocale: locale === "cs" ? "en_GB" : "cs_CZ",
      title: dict.meta.title,
      description: dict.meta.description,
      siteName: site.name,
    },
    robots: { index: true, follow: true },
  };
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();

  const dict = await getDictionary(locale as Locale);
  const session = await auth();

  return (
    <html
      lang={locale}
      className={`${playfair.variable} ${italiana.variable} ${jost.variable} ${jetbrainsMono.variable}`}
    >
      <body>
        <div className="pattern-bg" aria-hidden="true" />
        <div className="grain" aria-hidden="true" />

        <Header
          nav={dict.nav}
          closeLabel={dict.common.close}
          locale={locale as Locale}
          bookingHref={bookingUrl({ locale: locale as Locale })}
          isAdmin={session?.user?.role === "ADMIN"}
          isSignedIn={!!session?.user}
        />

        {children}
        <RevealFallback />
      </body>
    </html>
  );
}
