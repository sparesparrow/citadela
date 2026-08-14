import "server-only";
import type { Dictionary } from "@/dictionaries/en";

export const locales = ["cs", "en"] as const;
export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = "cs";
export const LOCALE_COOKIE = "citadela_locale";

export function isLocale(value: string | undefined | null): value is Locale {
  return !!value && (locales as readonly string[]).includes(value);
}

const dictionaries: Record<Locale, () => Promise<Dictionary>> = {
  cs: () => import("@/dictionaries/cs").then((m) => m.cs),
  en: () => import("@/dictionaries/en").then((m) => m.en),
};

export async function getDictionary(locale: Locale): Promise<Dictionary> {
  return dictionaries[locale]();
}

/** Formátování ceny podle jazyka. */
export function formatPrice(amount: number, locale: Locale): string {
  return new Intl.NumberFormat(locale === "cs" ? "cs-CZ" : "en-GB", {
    style: "currency",
    currency: "CZK",
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatDate(date: Date, locale: Locale): string {
  return new Intl.DateTimeFormat(locale === "cs" ? "cs-CZ" : "en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(date);
}
