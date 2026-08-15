/**
 * Jediný zdroj pravdy o obsazenosti.
 *
 * Proč to existuje: obsazenost má dva nezávislé zdroje a dřív se hlídal
 * jen jeden z nich.
 *
 *   `booking.com` — staženo iCalem z Extranetu, přepisuje se celé při
 *                   každé synchronizaci (`/api/cron/sync`).
 *   `direct`      — naše vlastní potvrzené rezervace.
 *
 * Poptávkový formulář kontroloval jen první zdroj. Potvrzená přímá
 * rezervace se sice publikovala odchozím iCalem (`/api/ical`), ale zpátky
 * k nám se dostala teprve tehdy, až si ji Booking.com stáhl a my ji zase
 * naimportovali — tedy s několikahodinovým zpožděním a jen když je
 * synchronizace vůbec nastavená. Do té doby šlo tentýž termín prodat
 * podruhé. Proto se každá potvrzená rezervace zapisuje rovnou do
 * `BlockedDate` se zdrojem `direct`.
 *
 * `BlockedDate` má unikátní klíč `(roomSlug, date, source)`. Ten je tady
 * použitý jako zámek: dvě souběžná potvrzení téhož termínu neprojdou obě,
 * druhé skončí na porušení unikátního klíče. Kontrola „nejdřív se podívám,
 * pak zapíšu" sama o sobě nestačí — mezi dotazem a zápisem se vejde druhý
 * požadavek.
 */

import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { UNIT, expandDates } from "@/lib/booking";

/** Zdroj obsazenosti pro vlastní potvrzené rezervace. */
export const DIRECT_SOURCE = "direct";

/** Zdroj obsazenosti stažené z Booking.com. Musí sedět se `/api/cron/sync`. */
export const BOOKING_SOURCE = "booking.com";

export type ConflictReason = "unavailable" | "not_found" | "invalid_dates";

/**
 * Vrátí data, která už jsou obsazená — z **obou** zdrojů.
 * Prázdné pole znamená volno.
 */
export async function findConflicts(
  arrival: Date,
  departure: Date,
  options: { roomSlug?: string; ignoreInquiryId?: string } = {},
): Promise<Date[]> {
  const roomSlug = options.roomSlug ?? UNIT;
  const wanted = expandDates(arrival, departure);
  if (wanted.length === 0) return [];

  const clashes = await prisma.blockedDate.findMany({
    where: {
      roomSlug,
      date: { in: wanted },
      // Při úpravě už potvrzené rezervace nesmí kolidovat sama se sebou.
      ...(options.ignoreInquiryId ? { NOT: { uid: options.ignoreInquiryId } } : {}),
    },
    select: { date: true },
  });

  return clashes.map((c) => c.date);
}

/** Je termín volný? Tenká obálka nad `findConflicts` pro čitelnost volání. */
export async function isAvailable(
  arrival: Date,
  departure: Date,
  options: { roomSlug?: string; ignoreInquiryId?: string } = {},
): Promise<boolean> {
  return (await findConflicts(arrival, departure, options)).length === 0;
}

export type ConfirmResult =
  | { ok: true; blockedDays: number }
  | { ok: false; reason: ConflictReason };

/**
 * Potvrdí poptávku a zabere jí termín.
 *
 * Obojí v jedné transakci: buď je rezervace potvrzená **a** termín zabraný,
 * nebo se nestalo nic. Kdyby to byly dva kroky, výpadek mezi nimi by nechal
 * potvrzenou rezervaci bez blokace v kalendáři — přesně ta situace, kvůli
 * které se termín prodal dvakrát.
 */
export async function confirmInquiry(inquiryId: string): Promise<ConfirmResult> {
  try {
    return await prisma.$transaction(async (tx) => {
      const inquiry = await tx.inquiry.findUnique({ where: { id: inquiryId } });
      if (!inquiry) return { ok: false, reason: "not_found" } as const;

      // Opakované potvrzení téže poptávky není chyba — jen se nic nemění.
      if (inquiry.status === "CONFIRMED") {
        const existing = await tx.blockedDate.count({
          where: { uid: inquiryId, source: DIRECT_SOURCE },
        });
        return { ok: true, blockedDays: existing } as const;
      }

      const dates = expandDates(inquiry.arrival, inquiry.departure);
      if (dates.length === 0) return { ok: false, reason: "invalid_dates" } as const;

      // Kontrola proti oběma zdrojům. Sama o sobě nestačí (viz komentář
      // nahoře), ale odchytí kolizi s Booking.com, kterou unikátní klíč
      // nezachytí — ten hlídá jen shodu v rámci téhož zdroje.
      const clash = await tx.blockedDate.findFirst({
        where: {
          roomSlug: inquiry.roomSlug,
          date: { in: dates },
          NOT: { uid: inquiryId },
        },
        select: { id: true },
      });
      if (clash) return { ok: false, reason: "unavailable" } as const;

      // Zámek: druhé souběžné potvrzení téhož termínu tady spadne na P2002.
      await tx.blockedDate.createMany({
        data: dates.map((date) => ({
          roomSlug: inquiry.roomSlug,
          date,
          source: DIRECT_SOURCE,
          uid: inquiryId,
          summary: `Přímá rezervace — ${inquiry.name}`,
        })),
      });

      await tx.inquiry.update({
        where: { id: inquiryId },
        data: { status: "CONFIRMED" },
      });

      return { ok: true, blockedDays: dates.length } as const;
    });
  } catch (error) {
    // P2002 = porušení unikátního klíče, tedy souběžné potvrzení téhož dne.
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return { ok: false, reason: "unavailable" };
    }
    throw error;
  }
}

/**
 * Uvolní termín potvrzené rezervace (storno nebo odmítnutí).
 * Maže výhradně řádky se zdrojem `direct` — obsazenost z Booking.com
 * nám nepatří a přepisuje ji jen synchronizace.
 */
export async function releaseInquiry(
  inquiryId: string,
  status: "DECLINED" | "NEW" = "DECLINED",
): Promise<{ released: number }> {
  const [deleted] = await prisma.$transaction([
    prisma.blockedDate.deleteMany({ where: { uid: inquiryId, source: DIRECT_SOURCE } }),
    prisma.inquiry.update({ where: { id: inquiryId }, data: { status } }),
  ]);
  return { released: deleted.count };
}
