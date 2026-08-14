import { describe, expect, it } from "vitest";
import {
  MAX_SKEW_SECONDS,
  generateDeviceKeyPair,
  generateNonce,
  readDeviceHeaders,
  signAsDevice,
  signingPayload,
  verifyDeviceSignature,
} from "./device-auth";
import { generateCredentialPublicId, verifyPhoneProof } from "./credential";
import { generateKeyPairSync, sign as cryptoSign } from "node:crypto";

const NOW = new Date("2026-08-12T12:00:00Z");

function makeSigned(body: string, keys = generateDeviceKeyPair()) {
  const timestamp = Math.floor(NOW.getTime() / 1000);
  const nonce = generateNonce();
  const signature = signAsDevice(keys.privateKey, signingPayload(timestamp, nonce, body));
  return { keys, headers: { deviceId: "door-gold", timestamp, nonce, signature } };
}

describe("verifyDeviceSignature", () => {
  it("prijme spravne podepsany pozadavek", () => {
    const body = JSON.stringify({ credentialPublicId: "abc" });
    const { keys, headers } = makeSigned(body);

    const result = verifyDeviceSignature({
      headers,
      body,
      devicePublicKey: keys.publicKey,
      now: NOW,
    });
    expect(result).toEqual({ ok: true });
  });

  it("odmitne zmenene telo pri stejnem podpisu", () => {
    const body = JSON.stringify({ credentialPublicId: "abc" });
    const { keys, headers } = makeSigned(body);

    const result = verifyDeviceSignature({
      headers,
      body: JSON.stringify({ credentialPublicId: "someone-else" }),
      devicePublicKey: keys.publicKey,
      now: NOW,
    });
    expect(result).toEqual({ ok: false, reason: "bad_signature" });
  });

  it("odmitne podpis cizim klicem", () => {
    const body = "{}";
    const { headers } = makeSigned(body);
    const other = generateDeviceKeyPair();

    const result = verifyDeviceSignature({
      headers,
      body,
      devicePublicKey: other.publicKey,
      now: NOW,
    });
    expect(result).toEqual({ ok: false, reason: "bad_signature" });
  });

  it("odmitne posunute hodiny", () => {
    const body = "{}";
    const { keys, headers } = makeSigned(body);
    const later = new Date(NOW.getTime() + (MAX_SKEW_SECONDS + 5) * 1000);

    const result = verifyDeviceSignature({
      headers,
      body,
      devicePublicKey: keys.publicKey,
      now: later,
    });
    expect(result).toEqual({ ok: false, reason: "clock_skew" });
  });

  it("odmitne zmeneny cas, i kdyz je jinak v okne", () => {
    // Utocnik posune timestamp, aby prodlouzil platnost — podpis nesedi.
    const body = "{}";
    const { keys, headers } = makeSigned(body);
    const tampered = { ...headers, timestamp: headers.timestamp + 30 };

    const result = verifyDeviceSignature({
      headers: tampered,
      body,
      devicePublicKey: keys.publicKey,
      now: NOW,
    });
    expect(result).toEqual({ ok: false, reason: "bad_signature" });
  });
});

describe("readDeviceHeaders", () => {
  function req(headers: Record<string, string>): Request {
    return new Request("https://citadela.test/api/access/authorize", {
      method: "POST",
      headers,
    });
  }

  it("odmitne chybejici hlavicky", () => {
    expect(readDeviceHeaders(req({ "x-device-id": "door-gold" }))).toBeNull();
  });

  it("odmitne prilis kratky nonce", () => {
    const headers = {
      "x-device-id": "door-gold",
      "x-timestamp": "1",
      "x-nonce": "short",
      "x-signature": "ab",
    };
    expect(readDeviceHeaders(req(headers))).toBeNull();
  });

  it("odmitne podpis, ktery neni hex", () => {
    const headers = {
      "x-device-id": "door-gold",
      "x-timestamp": "1",
      "x-nonce": generateNonce(),
      "x-signature": "nejaky-nesmysl",
    };
    expect(readDeviceHeaders(req(headers))).toBeNull();
  });
});

describe("verifyPhoneProof", () => {
  it("prijme podpis vyzvy z Keystore paru", () => {
    const { publicKey, privateKey } = generateKeyPairSync("ed25519");
    const challenge = generateNonce();
    const proof = cryptoSign(null, Buffer.from(challenge, "utf8"), privateKey).toString("hex");

    const result = verifyPhoneProof({
      publicKey: publicKey.export({ type: "spki", format: "der" }).toString("hex"),
      nonce: challenge,
      proof,
    });
    expect(result).toEqual({ ok: true });
  });

  it("odmitne podpis jine vyzvy — prehrany dukaz neprojde", () => {
    const { publicKey, privateKey } = generateKeyPairSync("ed25519");
    const oldChallenge = generateNonce();
    const proof = cryptoSign(null, Buffer.from(oldChallenge, "utf8"), privateKey).toString("hex");

    const result = verifyPhoneProof({
      publicKey: publicKey.export({ type: "spki", format: "der" }).toString("hex"),
      nonce: generateNonce(),
      proof,
    });
    expect(result).toEqual({ ok: false, reason: "bad_proof" });
  });

  it("odmitne dukaz, ktery neni hex", () => {
    const { publicKey } = generateKeyPairSync("ed25519");
    const result = verifyPhoneProof({
      publicKey: publicKey.export({ type: "spki", format: "der" }).toString("hex"),
      nonce: generateNonce(),
      proof: "ne-hex",
    });
    expect(result).toEqual({ ok: false, reason: "malformed_proof" });
  });
});

describe("generateCredentialPublicId", () => {
  it("nedava dvakrat stejnou hodnotu", () => {
    const seen = new Set(Array.from({ length: 500 }, () => generateCredentialPublicId()));
    expect(seen.size).toBe(500);
  });
});
