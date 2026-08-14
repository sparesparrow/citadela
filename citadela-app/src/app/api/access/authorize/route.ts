import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { decideAccess, type Decision } from "@/lib/access";
import { authenticateReader } from "@/lib/reader-request";
import { verifyCardProof, verifyPhoneProof } from "@/lib/credential";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Hlavni rozhodovaci endpoint. Vola ho ctecka u dveri i dok kolobezky.
 *
 * Cesta pozadavku:
 *   1. hlavicky + podpis zarizeni  (je to nase ctecka?)
 *   2. nonce jeste nebyl pouzity   (neni to prehrany zaznam?)
 *   3. dukaz prostredku            (ma host opravdu tu kartu/telefon?)
 *   4. rozhodovaci pravidla        (smi tam ted?)
 *   5. zapis do auditu             (vzdy, i pri zamitnuti)
 *
 * Pri jakekoli chybe se zamita. Radeji host jednou klepne dvakrat,
 * nez aby se otevrelo neco, co se otevrit nemelo.
 */

const schema = z.object({
  credentialPublicId: z.string().trim().min(8).max(64),
  /** Vyzva, kterou ctecka poslala prostredku. */
  challenge: z.string().trim().min(16).max(128),
  /** PHONE: Ed25519 podpis vyzvy. CARD: nepovinne. */
  proof: z.string().trim().max(512).optional(),
  /** CARD: vysledek vyzvy-odpovedi, kterou provedla sama ctecka. */
  readerVerified: z.boolean().optional(),
  /** Jen u doku: o kterou kolobezku jde. */
  scooterCode: z.string().trim().max(32).optional(),
});

function denied(reason: string, status = 200) {
  return NextResponse.json({ allowed: false, reason }, { status });
}

export async function POST(request: Request) {
  // --- 1. + 2. zarizeni a nonce -----------------------------------------
  // Podpis se overuje nad presnymi bajty tela, proto ho cte
  // authenticateReader a vraci nam je — neserializujeme znovu.
  const authed = await authenticateReader(request);
  if (!authed.ok) return denied(authed.reason, authed.status);

  const { accessPoint, rawBody } = authed;

  // --- telo --------------------------------------------------------------
  let payload: unknown;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "invalid" }, { status: 400 });
  }

  const parsed = schema.safeParse(payload);
  if (!parsed.success) return NextResponse.json({ error: "invalid" }, { status: 400 });
  const data = parsed.data;

  // --- 3. prostredek -----------------------------------------------------
  const credential = await prisma.credential.findUnique({
    where: { publicId: data.credentialPublicId },
    include: { stayGuest: { include: { stay: true } } },
  });

  // Neznamy prostredek se loguje taky — opakovane pokusy jsou signal.
  if (!credential) {
    await logEvent(accessPoint.id, null, false, "credential_unknown");
    return denied("credential_unknown");
  }

  const proof =
    credential.type === "PHONE"
      ? verifyPhoneProof({
          publicKey: credential.secretHash,
          nonce: data.challenge,
          proof: data.proof ?? "",
        })
      : verifyCardProof({ readerVerified: data.readerVerified === true });

  if (!proof.ok) {
    await logEvent(accessPoint.id, credential.id, false, proof.reason);
    return denied(proof.reason);
  }

  // --- 4. pravidla -------------------------------------------------------
  const scooter =
    accessPoint.kind === "SCOOTER_DOCK" && data.scooterCode
      ? await prisma.scooter.findUnique({ where: { code: data.scooterCode } })
      : null;

  const hasOpenRental =
    accessPoint.kind === "SCOOTER_DOCK"
      ? (await prisma.rentalSession.count({
          where: { stayGuestId: credential.stayGuestId, status: "OPEN" },
        })) > 0
      : false;

  const decision: Decision = decideAccess({
    now: new Date(),
    accessPoint: {
      kind: accessPoint.kind,
      enabled: accessPoint.enabled,
      bedroomSlug: accessPoint.bedroomSlug,
      isCommon: accessPoint.isCommon,
    },
    credential: {
      status: credential.status,
      validFrom: credential.validFrom,
      validTo: credential.validTo,
    },
    stay: credential.stayGuest.stay,
    guest: { bedroomSlug: credential.stayGuest.bedroomSlug },
    scooter: scooter ? { status: scooter.status } : null,
    hasOpenRental,
  });

  // --- 5. audit ----------------------------------------------------------
  await logEvent(accessPoint.id, credential.id, decision.allowed, decision.reason);

  if (!decision.allowed) return denied(decision.reason);

  return NextResponse.json({
    allowed: true,
    reason: "ok",
    guestName: credential.stayGuest.name,
    /** Jak dlouho smi ctecka drzet zamek otevreny. */
    openForMs: 5_000,
  });
}

async function logEvent(
  accessPointId: string,
  credentialId: string | null,
  allowed: boolean,
  reason: string,
) {
  await prisma.accessEvent.create({
    data: { accessPointId, credentialId, allowed, reason },
  });
}
