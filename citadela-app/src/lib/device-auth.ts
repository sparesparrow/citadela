/**
 * Autentizace hranicnich zarizeni (ctecky u dveri, doky kolobezek).
 *
 * Tohle NEJSOU prihlaseni uzivatele — Auth.js se sem neplete. Zarizeni
 * ma vlastni klic a kazdy pozadavek jim podepisuje:
 *
 *   X-Device-Id  identifikator AccessPoint
 *   X-Timestamp  unixovy cas v sekundach
 *   X-Nonce      nahodne cislo, jednou a nikdy vic
 *   X-Signature  Ed25519 podpis (hex) nad "timestamp.nonce.body"
 *
 * Proc Ed25519 a ne HMAC: u HMAC by server musel drzet stejny tajny klic
 * jako ctecka, aby podpis overil — a unik zalohy databaze by rovnou
 * znamenal moznost otevrit kazde dvere. Tady server drzi jen VEREJNY klic.
 * Privatni klic nikdy neopusti ctecku a v databazi neni co ukrast.
 *
 * Bez casoveho okna i nonce by sel odposlechnuty pozadavek proste prehrat
 * a dvere otevrit znovu. Potreba jsou obe kontroly, ne jen jedna.
 */

import {
  createPublicKey,
  createPrivateKey,
  generateKeyPairSync,
  randomBytes,
  sign as cryptoSign,
  verify as cryptoVerify,
} from "node:crypto";

/** Jak daleko smi byt hodiny ctecky od serveru. */
export const MAX_SKEW_SECONDS = 60;

/** Jak dlouho si pamatujeme nonce. Musi byt > 2 * MAX_SKEW_SECONDS. */
export const NONCE_TTL_SECONDS = 300;

export type DeviceAuthFailure =
  | "missing_headers"
  | "unknown_device"
  | "device_disabled"
  | "clock_skew"
  | "replayed_nonce"
  | "bad_signature";

export interface DeviceAuthHeaders {
  deviceId: string;
  timestamp: number;
  nonce: string;
  signature: string;
}

/** Vytahne a overi tvar hlavicek. Nekontroluje podpis. */
export function readDeviceHeaders(request: Request): DeviceAuthHeaders | null {
  const deviceId = request.headers.get("x-device-id");
  const timestampRaw = request.headers.get("x-timestamp");
  const nonce = request.headers.get("x-nonce");
  const signature = request.headers.get("x-signature");

  if (!deviceId || !timestampRaw || !nonce || !signature) return null;
  // Nonce omezujeme delkou, aby se z nej nedala udelat zapisova zbran.
  if (nonce.length < 16 || nonce.length > 128) return null;
  if (!/^[0-9a-f]+$/i.test(signature)) return null;

  const timestamp = Number(timestampRaw);
  if (!Number.isInteger(timestamp)) return null;

  return { deviceId, timestamp, nonce, signature };
}

/** Retezec, ktery se podepisuje. Poradi je soucast kontraktu se ctečkou. */
export function signingPayload(timestamp: number, nonce: string, body: string): string {
  return `${timestamp}.${nonce}.${body}`;
}

// ---------------------------------------------------------------------------
// Klice
// ---------------------------------------------------------------------------

export interface DeviceKeyPair {
  /** Verejny klic v SPKI/DER, hex. Tohle jde do AccessPoint.devicePublicKey. */
  publicKey: string;
  /** Privatni klic v PKCS8/DER, hex. Nasypat do ctecky a zapomenout. */
  privateKey: string;
}

/**
 * Vygeneruje par pro novou ctecku. Privatni cast se ukazuje jen jednou,
 * pri provisioningu — server si ji nikam neuklada.
 */
export function generateDeviceKeyPair(): DeviceKeyPair {
  const { publicKey, privateKey } = generateKeyPairSync("ed25519");
  return {
    publicKey: publicKey.export({ type: "spki", format: "der" }).toString("hex"),
    privateKey: privateKey.export({ type: "pkcs8", format: "der" }).toString("hex"),
  };
}

/** Nahodny nonce — pouziva ho testovaci klient i simulator ctecky. */
export function generateNonce(): string {
  return randomBytes(16).toString("hex");
}

/**
 * Podepsani na strane ctecky. V produkci bezi na zarizeni, tady je to
 * kvuli testum a simulatoru ctecky (scripts/simulate-reader.ts).
 */
export function signAsDevice(privateKeyHex: string, payload: string): string {
  const key = createPrivateKey({
    key: Buffer.from(privateKeyHex, "hex"),
    format: "der",
    type: "pkcs8",
  });
  return cryptoSign(null, Buffer.from(payload, "utf8"), key).toString("hex");
}

// ---------------------------------------------------------------------------
// Overeni
// ---------------------------------------------------------------------------

/**
 * Overi cas a podpis. Kontrolu nonce dela volajici (potrebuje databazi),
 * proto je tady jen cista kryptografie bez vedlejsich ucinku.
 */
export function verifyDeviceSignature(input: {
  headers: DeviceAuthHeaders;
  body: string;
  devicePublicKey: string;
  now?: Date;
}): { ok: true } | { ok: false; reason: DeviceAuthFailure } {
  const now = input.now ?? new Date();
  const nowSeconds = Math.floor(now.getTime() / 1000);

  if (Math.abs(nowSeconds - input.headers.timestamp) > MAX_SKEW_SECONDS) {
    return { ok: false, reason: "clock_skew" };
  }

  let key;
  try {
    key = createPublicKey({
      key: Buffer.from(input.devicePublicKey, "hex"),
      format: "der",
      type: "spki",
    });
  } catch {
    return { ok: false, reason: "unknown_device" };
  }

  const payload = signingPayload(input.headers.timestamp, input.headers.nonce, input.body);

  let ok = false;
  try {
    ok = cryptoVerify(
      null,
      Buffer.from(payload, "utf8"),
      key,
      Buffer.from(input.headers.signature, "hex"),
    );
  } catch {
    return { ok: false, reason: "bad_signature" };
  }

  return ok ? { ok: true } : { ok: false, reason: "bad_signature" };
}
