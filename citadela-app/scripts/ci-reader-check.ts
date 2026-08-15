/**
 * Automatická regrese přístupového systému pro CI.
 *
 * Simulátor `simulate-reader.ts` je na ruční zkoušení — vypisuje, ale
 * nerozhoduje. Tenhle skript tvrdí očekávání a končí nenulovým kódem,
 * jakmile se něco rozejde. Pouští se proti běžícímu serveru.
 *
 *   npx tsx scripts/ci-reader-check.ts
 *
 * Pokrývá hlavně to, co musí selhat: cizí pokoj, přehrání, posunuté hodiny,
 * druhá souběžná výpůjčka a dvojí účtování při opakovaném hlášení doku.
 */

import { BASE_URL, callReader, loadDevices, tapBody } from "./reader-client";

let failures = 0;
let checks = 0;

function check(name: string, ok: boolean, detail?: unknown) {
  checks += 1;
  if (ok) {
    console.log(`  ok   ${name}`);
  } else {
    failures += 1;
    console.error(`  FAIL ${name}`);
    if (detail !== undefined) console.error(`       ${JSON.stringify(detail)}`);
  }
}

async function main() {
  const data = loadDevices();
  const card = data.credentials.card;
  const phone = data.credentials.phone;

  const device = (id: string) => {
    const d = data.devices[id];
    if (!d) throw new Error(`Chybí čtečka "${id}" ve scripts/.devices.json`);
    return d.privateKey;
  };

  console.log(`Kontrola proti ${BASE_URL}\n`);

  // --- dveře ---------------------------------------------------------------
  console.log("Dveře:");

  const own = await callReader({
    endpoint: "/api/access/authorize",
    deviceId: "door-gold",
    devicePrivateKey: device("door-gold"),
    body: tapBody(card, "card"),
  });
  check("karta otevře vlastní pokoj", own.body.allowed === true, own.body);

  const foreign = await callReader({
    endpoint: "/api/access/authorize",
    deviceId: "door-silver",
    devicePrivateKey: device("door-silver"),
    body: tapBody(card, "card"),
  });
  check(
    "karta neotevře cizí pokoj",
    foreign.body.allowed === false && foreign.body.reason === "wrong_room",
    foreign.body,
  );

  const common = await callReader({
    endpoint: "/api/access/authorize",
    deviceId: "door-wellness",
    devicePrivateKey: device("door-wellness"),
    body: tapBody(card, "card"),
  });
  check("společný prostor je otevřený všem hostům", common.body.allowed === true, common.body);

  const byPhone = await callReader({
    endpoint: "/api/access/authorize",
    deviceId: "door-silver",
    devicePrivateKey: device("door-silver"),
    body: tapBody(phone, "phone"),
  });
  check("telefon (HCE) otevře vlastní pokoj", byPhone.body.allowed === true, byPhone.body);

  // --- útoky ---------------------------------------------------------------
  console.log("\nOdolnost:");

  const first = await callReader({
    endpoint: "/api/access/authorize",
    deviceId: "door-gold",
    devicePrivateKey: device("door-gold"),
    body: tapBody(card, "card"),
  });
  const replay = await callReader({
    endpoint: "/api/access/authorize",
    deviceId: "door-gold",
    devicePrivateKey: device("door-gold"),
    body: tapBody(card, "card"),
    nonce: first.nonce,
  });
  check(
    "přehraný požadavek je odmítnut (409)",
    replay.status === 409 && replay.body.reason === "replayed_nonce",
    replay,
  );

  const skewed = await callReader({
    endpoint: "/api/access/authorize",
    deviceId: "door-gold",
    devicePrivateKey: device("door-gold"),
    body: tapBody(card, "card"),
    skewSeconds: 300,
  });
  check(
    "posunuté hodiny jsou odmítnuty (401)",
    skewed.status === 401 && skewed.body.reason === "clock_skew",
    skewed,
  );

  const wrongKey = await callReader({
    endpoint: "/api/access/authorize",
    deviceId: "door-gold",
    // Podpis klíčem jiné čtečky — nesmí projít.
    devicePrivateKey: device("door-silver"),
    body: tapBody(card, "card"),
  });
  check(
    "podpis cizím klíčem je odmítnut (401)",
    wrongKey.status === 401 && wrongKey.body.reason === "bad_signature",
    wrongKey,
  );

  // --- koloběžky -----------------------------------------------------------
  console.log("\nKoloběžky:");

  const rent = await callReader({
    endpoint: "/api/rental/start",
    deviceId: "dock-garage",
    devicePrivateKey: device("dock-garage"),
    body: tapBody(phone, "phone", { scooterCode: "SC-01" }),
  });
  check("výpůjčka začne", rent.body.allowed === true, rent.body);

  const second = await callReader({
    endpoint: "/api/rental/start",
    deviceId: "dock-garage",
    devicePrivateKey: device("dock-garage"),
    body: tapBody(phone, "phone", { scooterCode: "SC-02" }),
  });
  check(
    "druhá souběžná výpůjčka je odmítnuta",
    second.body.allowed === false && second.body.reason === "rental_already_open",
    second.body,
  );

  const sessionId = rent.body.rentalSessionId as string | undefined;
  if (!sessionId) {
    check("výpůjčka vrátila identifikátor", false, rent.body);
  } else {
    const end = await callReader({
      endpoint: "/api/rental/end",
      deviceId: "dock-garage",
      devicePrivateKey: device("dock-garage"),
      body: { rentalSessionId: sessionId, batteryPct: 72 },
    });
    check(
      "vrácení uzavře výpůjčku a spočítá cenu",
      end.body.ok === true && typeof end.body.amountCents === "number",
      end.body,
    );

    const again = await callReader({
      endpoint: "/api/rental/end",
      deviceId: "dock-garage",
      devicePrivateKey: device("dock-garage"),
      body: { rentalSessionId: sessionId },
    });
    check(
      "opakované hlášení doku neúčtuje podruhé",
      again.body.ok === true && again.body.reason === "already_closed",
      again.body,
    );
  }

  console.log(`\n${checks - failures}/${checks} kontrol prošlo.`);
  if (failures > 0) process.exit(1);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
