import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { decideAccess, RENTAL_TERMS_VERSION } from "@/lib/access";
import { authenticateReader } from "@/lib/reader-request";
import { verifyCardProof, verifyPhoneProof } from "@/lib/credential";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const schema = z.object({
  credentialPublicId: z.string().trim().min(8).max(64),
  challenge: z.string().trim().min(16).max(128),
  proof: z.string().trim().max(512).optional(),
  readerVerified: z.boolean().optional(),
  scooterCode: z.string().trim().min(1).max(32),
});

export async function POST(request: Request) {
  const authed = await authenticateReader(request);
  if (!authed.ok) {
    return NextResponse.json({ allowed: false, reason: authed.reason }, { status: authed.status });
  }

  if (authed.accessPoint.kind !== "SCOOTER_DOCK") {
    return NextResponse.json({ allowed: false, reason: "wrong_access_point_kind" }, { status: 400 });
  }

  let payload: unknown;
  try {
    payload = JSON.parse(authed.rawBody);
  } catch {
    return NextResponse.json({ error: "invalid" }, { status: 400 });
  }

  const parsed = schema.safeParse(payload);
  if (!parsed.success) return NextResponse.json({ error: "invalid" }, { status: 400 });
  const data = parsed.data;

  const credential = await prisma.credential.findUnique({
    where: { publicId: data.credentialPublicId },
    include: { stayGuest: { include: { stay: true } } },
  });

  if (!credential) {
    await logEvent(authed.accessPoint.id, null, false, "credential_unknown");
    return NextResponse.json({ allowed: false, reason: "credential_unknown" });
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
    await logEvent(authed.accessPoint.id, credential.id, false, proof.reason);
    return NextResponse.json({ allowed: false, reason: proof.reason });
  }

  const scooter = await prisma.scooter.findUnique({ where: { code: data.scooterCode } });

  const hasOpenRental =
    (await prisma.rentalSession.count({
      where: { stayGuestId: credential.stayGuestId, status: "OPEN" },
    })) > 0;

  const decision = decideAccess({
    now: new Date(),
    accessPoint: {
      kind: "SCOOTER_DOCK",
      enabled: authed.accessPoint.enabled,
      bedroomSlug: authed.accessPoint.bedroomSlug,
      isCommon: authed.accessPoint.isCommon,
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

  await logEvent(authed.accessPoint.id, credential.id, decision.allowed, decision.reason);

  if (!decision.allowed || !scooter) {
    return NextResponse.json({ allowed: false, reason: decision.reason });
  }

  // Zamek na kolobezku: stav prepneme jen tehdy, kdyz je jeste volna.
  // Kdyby dva doky klepli naraz, druhy neaktualizuje nic a vypujcka nevznikne.
  const claimed = await prisma.scooter.updateMany({
    where: { id: scooter.id, status: "AVAILABLE" },
    data: { status: "RENTED" },
  });
  if (claimed.count === 0) {
    return NextResponse.json({ allowed: false, reason: "scooter_unavailable" });
  }

  const session = await prisma.rentalSession.create({
    data: {
      scooterId: scooter.id,
      stayGuestId: credential.stayGuestId,
      termsVersion: RENTAL_TERMS_VERSION,
    },
    select: { id: true, startedAt: true },
  });

  return NextResponse.json({
    allowed: true,
    reason: "ok",
    rentalSessionId: session.id,
    startedAt: session.startedAt.toISOString(),
    guestName: credential.stayGuest.name,
    scooterCode: scooter.code,
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
