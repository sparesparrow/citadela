/**
 * Overeni pristupoveho prostredku (karta / telefon).
 *
 * Klicove pravidlo cele te stavby: UID karty NENI tajemstvi. Precte ho
 * kdokoli s telefonem za par korun a naklonuje na prazdnou kartu za
 * nekolik sekund. Autorizace proto nikdy nestoji na UID, ale na tom,
 * ze prostredek dokaze odpovedet na cerstvou vyzvu.
 *
 *   CARD  — DESFire EV3, AES-128 klic diverzifikovany pro kazdou kartu
 *           z master klice. Master klic zije v HSM/KMS, nikdy tady.
 *           Ctecka provede vyzvu-odpoved a serveru posle vysledek.
 *   PHONE — HCE aplikace drzi Ed25519 par v Android Keystore
 *           (StrongBox, kde je). Podepisuje nonce od ctecky.
 *
 * V obou pripadech server vidi jen verejnou cast a dukaz. Pri uniku
 * databaze nejde vyrobit funkcni kopii zadneho prostredku.
 */

import { createPublicKey, randomBytes, verify as cryptoVerify } from "node:crypto";

export type CredentialProofFailure =
  | "unsupported_type"
  | "malformed_proof"
  | "bad_proof";

/** Verejny identifikator prostredku. Klidne muze byt na karte natistený. */
export function generateCredentialPublicId(): string {
  return randomBytes(12).toString("hex");
}

/**
 * Overi dukaz od telefonu: Ed25519 podpis nad nonce, ktery vydala ctecka.
 * `publicKey` je SPKI/DER v hex, presne jak ho aplikace zaregistrovala.
 */
export function verifyPhoneProof(input: {
  publicKey: string;
  nonce: string;
  proof: string;
}): { ok: true } | { ok: false; reason: CredentialProofFailure } {
  if (!/^[0-9a-f]+$/i.test(input.proof)) {
    return { ok: false, reason: "malformed_proof" };
  }

  let key;
  try {
    key = createPublicKey({
      key: Buffer.from(input.publicKey, "hex"),
      format: "der",
      type: "spki",
    });
  } catch {
    return { ok: false, reason: "malformed_proof" };
  }

  let ok = false;
  try {
    ok = cryptoVerify(
      null,
      Buffer.from(input.nonce, "utf8"),
      key,
      Buffer.from(input.proof, "hex"),
    );
  } catch {
    return { ok: false, reason: "bad_proof" };
  }

  return ok ? { ok: true } : { ok: false, reason: "bad_proof" };
}

/**
 * Overi dukaz od karty.
 *
 * DESFire vyzvu-odpoved provadi ctecka sama — ma v bezpecnem prvku
 * diverzifikovany klic a serveru hlasi jen vysledek. Server proto
 * neoveruje kryptografii karty, ale to, ze mu vysledek poslala
 * *duveryhodna ctecka* — a to uz zaridil podpis zarizeni
 * (src/lib/device-auth.ts) o kus driv v ceste pozadavku.
 *
 * `secretHash` u karty tedy slouzi jen k parovani konkretniho kusu
 * plastu, ne jako tajemstvi. Zamerne oddelene, aby bylo z kodu videt,
 * ze duveru nese ctecka, ne karta.
 */
export function verifyCardProof(input: {
  /** Ctecka hlasi, zda jeji vyzva-odpoved s kartou uspela. */
  readerVerified: boolean;
}): { ok: true } | { ok: false; reason: CredentialProofFailure } {
  return input.readerVerified ? { ok: true } : { ok: false, reason: "bad_proof" };
}
