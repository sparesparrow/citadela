/**
 * Spolecny zacatek kazde route, kterou vola hranicni zarizeni:
 * overi podpis ctecky a spotrebuje nonce. Az potom se resi obsah.
 *
 * Zamerne jedno misto — kdyby si to kazda route delala po svem,
 * driv nebo pozdeji nekde vypadne kontrola prehrani.
 */

import { prisma } from "@/lib/prisma";
import {
  NONCE_TTL_SECONDS,
  readDeviceHeaders,
  verifyDeviceSignature,
} from "@/lib/device-auth";
import type { AccessPoint } from "@/generated/prisma/client";

export type ReaderAuthResult =
  | { ok: true; accessPoint: AccessPoint; rawBody: string }
  | { ok: false; reason: string; status: number };

export async function authenticateReader(request: Request): Promise<ReaderAuthResult> {
  const headers = readDeviceHeaders(request);
  if (!headers) return { ok: false, reason: "missing_headers", status: 401 };

  const rawBody = await request.text();

  const accessPoint = await prisma.accessPoint.findUnique({
    where: { id: headers.deviceId },
  });
  // Neznamy deviceId neumime pripsat k zadne ctecce, takze ho do auditu
  // nezapisujeme — jinak by kdokoli zvenci plnil tabulku radky.
  if (!accessPoint) return { ok: false, reason: "unknown_device", status: 401 };

  if (!accessPoint.enabled) {
    await logDeviceRejection(accessPoint.id, "device_disabled");
    return { ok: false, reason: "device_disabled", status: 403 };
  }

  const signature = verifyDeviceSignature({
    headers,
    body: rawBody,
    devicePublicKey: accessPoint.devicePublicKey,
  });
  if (!signature.ok) {
    // Spatny podpis nebo posunute hodiny jsou bezpecnostni signal:
    // bez zaznamu by zkousení ctecky zvenci bylo uplne neviditelne.
    await logDeviceRejection(accessPoint.id, signature.reason);
    return { ok: false, reason: signature.reason, status: 401 };
  }

  const expiresAt = new Date(Date.now() + NONCE_TTL_SECONDS * 1000);
  try {
    await prisma.usedNonce.create({
      data: { nonce: headers.nonce, deviceId: headers.deviceId, expiresAt },
    });
  } catch {
    await logDeviceRejection(accessPoint.id, "replayed_nonce");
    return { ok: false, reason: "replayed_nonce", status: 409 };
  }

  return { ok: true, accessPoint, rawBody };
}

/**
 * Zamitnuti na urovni zarizeni — jeste nevime, jaky prostredek se prikladal,
 * proto credentialId zustava prazdne.
 */
async function logDeviceRejection(accessPointId: string, reason: string) {
  await prisma.accessEvent.create({
    data: { accessPointId, credentialId: null, allowed: false, reason },
  });
}
