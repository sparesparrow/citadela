/**
 * Doba uchování záznamů o přístupech.
 *
 * `AccessEvent` je záznam o pohybu konkrétní osoby po budově — osobní údaj.
 * GDPR nedovoluje držet ho déle, než je nezbytné, takže má pevně danou
 * dobu platnosti. Hodnota žije tady, ne v route, protože route v Next.js
 * smí exportovat jen předepsaná jména a tohle se má dát i otestovat.
 */

/** Výchozí doba uchování, pokud není nastaveno jinak. */
export const DEFAULT_RETENTION_DAYS = 90;

/**
 * Přečte `ACCESS_EVENT_RETENTION_DAYS`. Nula, záporné číslo ani nesmysl
 * neprojdou — smazaly by i dnešní záznamy, což je skoro jistě překlep,
 * ne záměr.
 */
export function retentionDays(): number {
  const raw = Number(process.env.ACCESS_EVENT_RETENTION_DAYS);
  if (!Number.isFinite(raw) || raw <= 0) return DEFAULT_RETENTION_DAYS;
  return Math.floor(raw);
}

/** Hranice, pod kterou se záznamy mažou. */
export function retentionCutoff(now: Date, days = retentionDays()): Date {
  return new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
}
