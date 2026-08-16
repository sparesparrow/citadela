/**
 * Rozhodovaci logika pristupu — ciste funkce, zadny Prisma, zadne HTTP.
 * Diky tomu se da otestovat bez databaze i bez ctecky.
 *
 * Zamerne oddelene od /api/access/authorize: route resi autentizaci
 * zarizeni a zapis auditu, tenhle soubor resi *jestli* se ma otevrit.
 */

import { site, rentalTerms } from "./site";
import type { BedroomSlug } from "./site";

// ---------------------------------------------------------------------------
// Duvody zamitnuti — vycet, ne volny text. Loguji se do AccessEvent.reason
// a personal podle nich pozna, co se stalo, bez ctení kodu.
// ---------------------------------------------------------------------------

export const DENY_REASONS = [
  "access_point_disabled",
  "credential_unknown",
  "credential_revoked",
  "credential_not_yet_valid",
  "credential_expired",
  "stay_not_checked_in",
  "stay_cancelled",
  "outside_stay_window",
  "wrong_room",
  "no_room_assigned",
  "scooter_unavailable",
  "rental_already_open",
] as const;

export type DenyReason = (typeof DENY_REASONS)[number];

export type Decision =
  | { allowed: true; reason: "ok" }
  | { allowed: false; reason: DenyReason };

const ALLOW: Decision = { allowed: true, reason: "ok" };

function deny(reason: DenyReason): Decision {
  return { allowed: false, reason };
}

// ---------------------------------------------------------------------------
// Vstupy — zamerne plocha data, ne Prisma modely. Route si je namapuje.
// ---------------------------------------------------------------------------

export interface AccessPointView {
  kind: "DOOR" | "SCOOTER_DOCK";
  enabled: boolean;
  bedroomSlug: string | null;
  isCommon: boolean;
}

export interface CredentialView {
  status: "ACTIVE" | "REVOKED" | "EXPIRED";
  validFrom: Date;
  validTo: Date;
}

export interface StayView {
  status: "BOOKED" | "CHECKED_IN" | "CHECKED_OUT" | "CANCELLED";
  arrival: Date;
  departure: Date;
}

export interface GuestView {
  bedroomSlug: string | null;
}

export interface ScooterView {
  status: "AVAILABLE" | "RENTED" | "CHARGING" | "MAINTENANCE";
}

export interface AuthorizeInput {
  now: Date;
  accessPoint: AccessPointView;
  /** null = publicId neodpovida zadnemu prostredku. */
  credential: CredentialView | null;
  stay: StayView;
  guest: GuestView;
  /** Jen pro SCOOTER_DOCK. */
  scooter?: ScooterView | null;
  /** Ma host uz otevrenou jinou vypujcku? Jen pro SCOOTER_DOCK. */
  hasOpenRental?: boolean;
}

// ---------------------------------------------------------------------------
// Casove okno pobytu
// ---------------------------------------------------------------------------

/** "16:00" -> [16, 0] */
function parseClock(value: string): [number, number] {
  const [h, m] = value.split(":").map(Number);
  return [h ?? 0, m ?? 0];
}

/**
 * Okno, kdy pobyt fyzicky plati: od check-inu v den prijezdu
 * do check-outu v den odjezdu (casy zijou v site.checkIn / site.checkOut).
 */
export function stayWindow(stay: StayView): { from: Date; to: Date } {
  const [inH, inM] = parseClock(site.checkIn);
  const [outH, outM] = parseClock(site.checkOut);

  const from = new Date(stay.arrival);
  from.setHours(inH, inM, 0, 0);

  const to = new Date(stay.departure);
  to.setHours(outH, outM, 0, 0);

  return { from, to };
}

// ---------------------------------------------------------------------------
// Hlavni rozhodnuti
// ---------------------------------------------------------------------------

/**
 * Poradi kontrol neni nahodne: nejdriv levne a nejcastejsi duvody,
 * pak teprve specifika daneho typu ctecky. Pri jakekoli pochybnosti
 * se zamita — fail-closed.
 */
export function decideAccess(input: AuthorizeInput): Decision {
  const { now, accessPoint, credential, stay, guest } = input;

  if (!accessPoint.enabled) return deny("access_point_disabled");

  // --- prostredek ---
  if (!credential) return deny("credential_unknown");
  if (credential.status === "REVOKED") return deny("credential_revoked");
  if (credential.status === "EXPIRED") return deny("credential_expired");
  if (now < credential.validFrom) return deny("credential_not_yet_valid");
  if (now > credential.validTo) return deny("credential_expired");

  // --- pobyt ---
  if (stay.status === "CANCELLED") return deny("stay_cancelled");
  if (stay.status !== "CHECKED_IN") return deny("stay_not_checked_in");

  const window = stayWindow(stay);
  if (now < window.from || now > window.to) return deny("outside_stay_window");

  // --- podle typu ctecky ---
  if (accessPoint.kind === "DOOR") return decideDoor(accessPoint, guest);
  return decideScooterDock(input);
}

function decideDoor(accessPoint: AccessPointView, guest: GuestView): Decision {
  // Spolecne prostory (vstup, wellness) jsou pro kazdeho aktivniho hosta.
  if (accessPoint.isCommon) return ALLOW;

  if (!guest.bedroomSlug) return deny("no_room_assigned");
  if (accessPoint.bedroomSlug !== guest.bedroomSlug) return deny("wrong_room");

  return ALLOW;
}

function decideScooterDock(input: AuthorizeInput): Decision {
  if (input.hasOpenRental) return deny("rental_already_open");

  const scooter = input.scooter;
  if (!scooter || scooter.status !== "AVAILABLE") return deny("scooter_unavailable");

  return ALLOW;
}

// ---------------------------------------------------------------------------
// Cena vypujcky
// ---------------------------------------------------------------------------

/**
 * Aktualni verze podminek pujcovny. Zaznamena se ke kazde vypujcce,
 * aby slo pozdeji dolozit, s cim host souhlasil. Bere se z rentalTerms
 * v site.ts — verze u zapujcky musi odkazovat na dokument, ktery existuje.
 */
export const RENTAL_TERMS_VERSION = rentalTerms.version;

export interface RentalPricing {
  baseFeeCents: number;
  perMinuteCents: number;
}

/**
 * Cena v halerich. Zacata minuta se uctuje cela — je to pro hosta
 * srozumitelnejsi nez sekundova presnost a nevznikaji spory o zaokrouhleni.
 */
export function priceRental(
  startedAt: Date,
  endedAt: Date,
  pricing: RentalPricing,
): number {
  const ms = endedAt.getTime() - startedAt.getTime();
  const minutes = Math.max(1, Math.ceil(ms / 60_000));
  return pricing.baseFeeCents + minutes * pricing.perMinuteCents;
}

/** Slug loznice ze site.ts, pokud odpovida. Jinak null. */
export function asBedroomSlug(value: string | null | undefined): BedroomSlug | null {
  if (!value) return null;
  return value as BedroomSlug;
}
