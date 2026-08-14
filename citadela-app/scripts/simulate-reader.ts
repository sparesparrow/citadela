/**
 * Simulátor čtečky. Zastupuje hraniční zařízení, dokud nedorazí hardware.
 *
 *   npx tsx scripts/simulate-reader.ts door-gold card
 *   npx tsx scripts/simulate-reader.ts door-gold phone
 *   npx tsx scripts/simulate-reader.ts dock-garage phone --rent SC-01
 *   npx tsx scripts/simulate-reader.ts door-gold card --replay
 *   npx tsx scripts/simulate-reader.ts door-gold card --skew 300
 *
 * Klíče čte ze scripts/.devices.json, který zapsal seed.
 */

import { readFileSync } from "node:fs";
import path from "node:path";
import { sign as cryptoSign, createPrivateKey } from "node:crypto";
import { generateNonce, signAsDevice, signingPayload } from "../src/lib/device-auth";

interface DevicesFile {
  devices: Record<string, { privateKey: string; label: string }>;
  credentials: Record<string, { publicId: string; privateKey?: string }>;
  guests: Record<string, { name: string; bedroomSlug: string | null }>;
}

const BASE = process.env.SIMULATE_BASE_URL ?? "http://localhost:3000";

function loadDevices(): DevicesFile {
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
function signAsPhone(privateKeyHex: string, challenge: string): string {
  const key = createPrivateKey({
    key: Buffer.from(privateKeyHex, "hex"),
    format: "der",
    type: "pkcs8",
  });
  return cryptoSign(null, Buffer.from(challenge, "utf8"), key).toString("hex");
}

async function callReader(options: {
  endpoint: string;
  deviceId: string;
  devicePrivateKey: string;
  body: unknown;
  /** Vnutit konkrétní nonce — pro test přehrání. */
  nonce?: string;
  /** Posun hodin v sekundách — pro test časového okna. */
  skewSeconds?: number;
}) {
  const raw = JSON.stringify(options.body);
  const timestamp = Math.floor(Date.now() / 1000) + (options.skewSeconds ?? 0);
  const nonce = options.nonce ?? generateNonce();
  const signature = signAsDevice(
    options.devicePrivateKey,
    signingPayload(timestamp, nonce, raw),
  );

  const response = await fetch(`${BASE}${options.endpoint}`, {
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
  let parsed: unknown = text;
  try {
    parsed = JSON.parse(text);
  } catch {
    // necháme jako text
  }
  return { status: response.status, body: parsed, nonce };
}

async function main() {
  const [deviceId, credentialKind, ...rest] = process.argv.slice(2);

  if (!deviceId || !credentialKind) {
    console.error("Použití: tsx scripts/simulate-reader.ts <deviceId> <card|phone> [--rent CODE] [--replay] [--skew N]");
    process.exit(1);
  }

  const data = loadDevices();
  const device = data.devices[deviceId];
  if (!device) {
    console.error(`Neznámá čtečka "${deviceId}". Dostupné: ${Object.keys(data.devices).join(", ")}`);
    process.exit(1);
  }

  const credential = data.credentials[credentialKind];
  if (!credential) {
    console.error(`Neznámý prostředek "${credentialKind}". Dostupné: ${Object.keys(data.credentials).join(", ")}`);
    process.exit(1);
  }

  const rentIndex = rest.indexOf("--rent");
  const scooterCode = rentIndex >= 0 ? rest[rentIndex + 1] : undefined;
  const replay = rest.includes("--replay");
  const skewIndex = rest.indexOf("--skew");
  const skewSeconds = skewIndex >= 0 ? Number(rest[skewIndex + 1]) : undefined;

  // Vraceni kolobezky do stojanu — dok hlasi konec vypujcky.
  // Prostredek uz se nepriklada, hlasi to samo zarizeni.
  const endIndex = rest.indexOf("--end");
  if (endIndex >= 0) {
    const rentalSessionId = rest[endIndex + 1];
    const batteryIndex = rest.indexOf("--battery");
    const result = await callReader({
      endpoint: "/api/rental/end",
      deviceId,
      devicePrivateKey: device.privateKey,
      body: {
        rentalSessionId,
        ...(batteryIndex >= 0 ? { batteryPct: Number(rest[batteryIndex + 1]) } : {}),
      },
    });
    console.log(`Čtečka: ${device.label} (${deviceId})`);
    console.log(`Ukončení výpůjčky ${rentalSessionId}\n`);
    console.log(`→ HTTP ${result.status}`);
    console.log(JSON.stringify(result.body, null, 2));
    return;
  }

  // Výzva, kterou by čtečka vyslala prostředku.
  const challenge = generateNonce();

  const body: Record<string, unknown> = {
    credentialPublicId: credential.publicId,
    challenge,
  };

  if (credentialKind === "phone") {
    body.proof = signAsPhone(credential.privateKey!, challenge);
  } else {
    // U karty provede výzvu-odpověď sama čtečka a hlásí jen výsledek.
    body.readerVerified = true;
  }

  const endpoint = scooterCode ? "/api/rental/start" : "/api/access/authorize";
  if (scooterCode) body.scooterCode = scooterCode;

  const guest = data.guests[credentialKind];
  console.log(`Čtečka: ${device.label} (${deviceId})`);
  console.log(`Prostředek: ${credentialKind} — ${guest?.name} / pokoj ${guest?.bedroomSlug ?? "—"}`);
  console.log(`Endpoint: ${endpoint}`);
  if (skewSeconds) console.log(`Posun hodin: ${skewSeconds}s`);
  console.log("");

  const first = await callReader({
    endpoint,
    deviceId,
    devicePrivateKey: device.privateKey,
    body,
    skewSeconds,
  });

  console.log(`→ HTTP ${first.status}`);
  console.log(JSON.stringify(first.body, null, 2));

  if (replay) {
    console.log("\n--- přehrání stejného nonce ---");
    const second = await callReader({
      endpoint,
      deviceId,
      devicePrivateKey: device.privateKey,
      body,
      nonce: first.nonce,
    });
    console.log(`→ HTTP ${second.status}`);
    console.log(JSON.stringify(second.body, null, 2));

    if (second.status === 409) {
      console.log("\nOK — přehraný požadavek byl odmítnut.");
    } else {
      console.log("\nCHYBA — přehraný požadavek NEBYL odmítnut!");
      process.exitCode = 1;
    }
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
