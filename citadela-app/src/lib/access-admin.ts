/**
 * Nacteni prehledu pristupoveho systemu pro administraci.
 * Oddelene od stranky, aby sla stejna data pouzit i jinde (export, e-mail).
 */

import { prisma } from "@/lib/prisma";
import { formatPrice, type Locale } from "@/lib/i18n";

/**
 * Castky drzime v halerich, ale zobrazujeme v korunach — prevod je
 * jediny rozdil oproti formatPrice, ktery uz v projektu je.
 */
export function formatCents(cents: number, locale: Locale): string {
  return formatPrice(cents / 100, locale);
}

/** Tón stavu pro .pill[data-tone] — mapovani stavu na vizualni hlas. */
export function stayTone(status: string): "ok" | "warn" | "bad" | "mute" {
  if (status === "CHECKED_IN") return "ok";
  if (status === "BOOKED") return "warn";
  if (status === "CANCELLED") return "bad";
  return "mute";
}

export function scooterTone(status: string): "ok" | "warn" | "bad" | "mute" {
  if (status === "AVAILABLE") return "ok";
  if (status === "RENTED") return "warn";
  if (status === "MAINTENANCE") return "bad";
  return "mute";
}

export async function loadAccessOverview() {
  const now = new Date();

  const [stays, scooters, accessPoints, events, openRentals, deniedToday] =
    await Promise.all([
      prisma.stay.findMany({
        where: { status: { in: ["BOOKED", "CHECKED_IN"] } },
        orderBy: { arrival: "asc" },
        include: {
          stayGuests: {
            include: {
              credentials: { orderBy: { createdAt: "desc" } },
            },
          },
          folioItems: true,
        },
      }),
      prisma.scooter.findMany({ orderBy: { code: "asc" } }),
      prisma.accessPoint.findMany({ orderBy: [{ kind: "asc" }, { label: "asc" }] }),
      prisma.accessEvent.findMany({
        orderBy: { at: "desc" },
        take: 40,
        include: {
          accessPoint: { select: { label: true } },
          credential: {
            select: { label: true, stayGuest: { select: { name: true } } },
          },
        },
      }),
      prisma.rentalSession.count({ where: { status: "OPEN" } }),
      prisma.accessEvent.count({
        where: {
          allowed: false,
          at: { gte: new Date(now.getTime() - 24 * 60 * 60 * 1000) },
        },
      }),
    ]);

  const activeCredentials = await prisma.credential.count({
    where: { status: "ACTIVE", validTo: { gte: now } },
  });

  return { stays, scooters, accessPoints, events, openRentals, deniedToday, activeCredentials };
}
