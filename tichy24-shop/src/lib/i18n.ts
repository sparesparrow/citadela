import "server-only";
import { de, type Dictionary } from "@/dictionaries/de";

/**
 * Zatim jediny jazyk je nemcina (de-CH). Volani zustava asynchronni a
 * pres jednu funkci kvuli pozdejsimu pridani francouzstiny/italstiny —
 * Svycarsko je vicejazycne a pak se zmeni jen tento soubor a pribude
 * slovnik, ne vsechna mista, kde se texty pouzivaji.
 *
 * Pozor stejne jako v citadela-app: slovnik obsahuje FUNKCE, ktere React
 * neprenese z serveru do klientske komponenty. Klientske komponenty dostavaji
 * jen uzky vyrez s hotovymi retezci.
 */
export async function getDictionary(): Promise<Dictionary> {
  return de;
}

export function formatDateTime(date: Date): string {
  return new Intl.DateTimeFormat("de-CH", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Zurich",
  }).format(date);
}

export function formatDate(date: Date): string {
  return new Intl.DateTimeFormat("de-CH", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Europe/Zurich",
  }).format(date);
}
