/**
 * Sdílený klient čtečky.
 *
 * Používá ho ruční simulátor (`simulate-reader.ts`) i automatická kontrola
 * v CI (`ci-reader-check.ts`) — podpisy a hlavičky se tak počítají na jednom
 * místě. Kdyby si každý skript podepisoval po svém, jeden z nich by dřív
 * nebo později testoval něco jiného, než co běží v provozu.
 */

import { readFileSync } from "node:fs";
import path from "node:path";
import { createPrivateKey, sign as cryptoSign } from "node:crypto";
import { generateNonce, signAsDevice, signingPayload } from "../src/lib/device-auth";

export interface DevicesFile {
  devices: Record<string, { privateKey: string; label: string }>;
  credentials: Record<string, { publicId: string; privateKey?: string }>;
  guests: Record<string, { name: string; bedroomSlug: string | null }>;
}

export const BASE_URL = process.env.SIMULATE_BASE_URL ?? "http://localhost:3000";

export function loadDevices(): DevicesFile {
  const file = path.join(process.cwd(), "scripts", ".devices.json");
  try {
    return JSON.parse(readFileSync(file, "utf8")) as DevicesFile;
  } catch {
    throw new Error(
      "Chybí scripts/.devices.json — spusťte nejdřív SEED_DEMO_ACCESS=1 npm run db:seed",
    );
  }
}

/** Odpověď telefonu na výzvu — v provozu ji podepíše Android Keystore. */
export function signAsPhone(privateKeyHex: string, challenge: string): string {
  const key = createPrivateKey({
    key: Buffer.from(privateKeyHex, "hex"),
    format: "der",
    type: "pkcs8",
  });
  return cryptoSign(null, Buffer.from(challenge, "utf8"), key).toString("hex");
}

export interface ReaderCall {
  endpoint: string;
  deviceId: string;
  devicePrivateKey: string;
  body: unknown;
  /** Vnutit konkrétní nonce — pro test přehrání. */
  nonce?: string;
  /** Posun hodin v sekundách — pro test časového okna. */
  skewSeconds?: number;
}

export interface ReaderResponse {
  status: number;
  body: Record<string, unknown>;
  nonce: string;
}

export async function callReader(options: ReaderCall): Promise<ReaderResponse> {
  const raw = JSON.stringify(options.body);
  const timestamp = Math.floor(Date.now() / 1000) + (options.skewSeconds ?? 0);
  const nonce = options.nonce ?? generateNonce();
  const signature = signAsDevice(
    options.devicePrivateKey,
    signingPayload(timestamp, nonce, raw),
  );

  const response = await fetch(`${BASE_URL}${options.endpoint}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Device-Id": options.deviceId,
      "X-Timestamp": String(timestamp),
      "X-Nonce": nonce,
      "X-Signature": signature,
    },
    body: raw,
  });

  const text = await response.text();
  let body: Record<string, unknown> = {};
  try {
    body = JSON.parse(text) as Record<string, unknown>;
  } catch {
    body = { raw: text };
  }
  return { status: response.status, body, nonce };
}

/**
 * Sestaví tělo přiložení prostředku ke čtečce. U telefonu podepíše výzvu,
 * u karty jen ohlásí, že výzva-odpověď na čtečce proběhla.
 */
export function tapBody(
  credential: { publicId: string; privateKey?: string },
  kind: "card" | "phone",
  extra: Record<string, unknown> = {},
): Record<string, unknown> {
  const challenge = generateNonce();
  const body: Record<string, unknown> = {
    credentialPublicId: credential.publicId,
    challenge,
    ...extra,
  };
  if (kind === "phone") body.proof = signAsPhone(credential.privateKey!, challenge);
  else body.readerVerified = true;
  return body;
}
