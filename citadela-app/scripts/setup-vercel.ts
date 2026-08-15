/**
 * Nastaví projekt na Vercelu do stavu, ze kterého jde nasadit.
 *
 * Ručně to znamená naklikat dvanáct proměnných prostředí, u čtyř z nich
 * nepřehodit pooled a přímý řetězec a u žádné neudělat překlep. Tenhle
 * skript to udělá za jeden běh a je idempotentní — pustit ho podruhé nic
 * nerozbije, existující proměnné přepíše.
 *
 *   npx vercel login          # jednou, interaktivně, dělá člověk
 *   npx tsx scripts/setup-vercel.ts
 *   npx tsx scripts/setup-vercel.ts --deploy    # rovnou i nasadí
 *
 * Co skript zásadně NEDĚLÁ: nesahá na DNS ve Wedosu a nepřihlašuje se.
 * Konkrétní A a CNAME vypíše na konci — Vercel je přiděluje per projekt,
 * takže se nedají předem uhodnout.
 */

import { execFileSync } from "node:child_process";
import { randomBytes } from "node:crypto";

const NEON_PROJECT = "shy-hill-84217339";
const DOMAIN = "citadela-resort.cz";
const PROJECT = "citadela-resort";

/** Proměnné, které nejsou tajemství a mají pevnou hodnotu. */
const PLAIN_VARS: Record<string, string> = {
  AUTH_URL: `https://${DOMAIN}`,
  AUTH_TRUST_HOST: "true",
  BOOKING_HOTEL_PATH: "cz/citadela",
  ACCESS_EVENT_RETENTION_DAYS: "90",
};

function run(cmd: string, args: string[], input?: string): string {
  return execFileSync(cmd, args, {
    encoding: "utf8",
    input,
    stdio: ["pipe", "pipe", "pipe"],
    shell: process.platform === "win32",
  });
}

function tryRun(cmd: string, args: string[], input?: string): string | null {
  try {
    return run(cmd, args, input);
  } catch {
    return null;
  }
}

/**
 * Neon vrací řetězec na poslední řádce, ale před ním umí být hlášky npx.
 * Bereme proto poslední řádku, která vypadá jako connection string.
 */
function neonUrl(branch: string, pooled: boolean): string {
  const args = ["-y", "neon", "connection-string", branch, "--project-id", NEON_PROJECT];
  if (pooled) args.push("--pooled");
  const out = run("npx", args);
  const line = out
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.startsWith("postgresql://"))
    .pop();
  if (!line) throw new Error(`Neon nevrátil connection string pro větev ${branch}.`);
  return line;
}

/**
 * `vercel env add` čte hodnotu ze stdin. Existující proměnnou nepřepíše,
 * proto ji nejdřív odstraníme — selhání odstranění je v pořádku, znamená
 * jen, že tam ještě nebyla.
 */
function setEnv(name: string, value: string): void {
  tryRun("npx", ["-y", "vercel", "env", "rm", name, "production", "--yes"]);
  run("npx", ["-y", "vercel", "env", "add", name, "production"], `${value}\n`);
  console.log(`  ok   ${name}`);
}

function main(): void {
  const who = tryRun("npx", ["-y", "vercel", "whoami"]);
  if (!who || /Logged out/i.test(who)) {
    console.error("Nejste přihlášen k Vercelu. Spusťte `npx vercel login` a zkuste znovu.");
    process.exit(1);
  }
  console.log(`Vercel: ${who.trim().split(/\r?\n/).pop()}`);

  console.log("\nPropojuji projekt…");
  run("npx", ["-y", "vercel", "link", "--yes", "--project", PROJECT]);

  console.log("\nTahám připojovací řetězce z Neonu…");
  const pooled = neonUrl("production", true);
  const direct = neonUrl("production", false);
  if (!pooled.includes("-pooler")) throw new Error("Pooled řetězec nemá -pooler.");
  if (direct.includes("-pooler")) throw new Error("Přímý řetězec má -pooler.");

  console.log("\nNastavuji proměnné prostředí (production):");
  setEnv("DATABASE_URL", pooled);
  setEnv("DATABASE_URL_UNPOOLED", direct);
  for (const [name, value] of Object.entries(PLAIN_VARS)) setEnv(name, value);

  // Tajemství se generují tady a nikam se neukládají. Kdo je potřebuje
  // znovu, přečte si je ve Vercelu; do repozitáře nepatří.
  const admin = process.env.ADMIN_EMAIL;
  const adminPassword = process.env.ADMIN_PASSWORD;
  if (!admin || !adminPassword) {
    console.error(
      "\nChybí ADMIN_EMAIL a ADMIN_PASSWORD v prostředí — účet personálu si\n" +
        "nastavte sám, aby heslo neprošlo přes tenhle skript:\n" +
        "  ADMIN_EMAIL=vy@example.cz ADMIN_PASSWORD='…' npx tsx scripts/setup-vercel.ts",
    );
    process.exit(1);
  }
  setEnv("AUTH_SECRET", randomBytes(32).toString("base64"));
  setEnv("CRON_SECRET", randomBytes(32).toString("hex"));
  setEnv("ADMIN_EMAIL", admin);
  setEnv("ADMIN_PASSWORD", adminPassword);

  if (process.argv.includes("--deploy")) {
    console.log("\nNasazuji…");
    console.log(run("npx", ["-y", "vercel", "deploy", "--prod", "--yes"]));

    console.log(`\nPřipojuji doménu ${DOMAIN}…`);
    tryRun("npx", ["-y", "vercel", "domains", "add", DOMAIN, PROJECT]);
    tryRun("npx", ["-y", "vercel", "domains", "add", `www.${DOMAIN}`, PROJECT]);

    console.log("\nHodnoty pro DNS ve Wedosu:");
    console.log(tryRun("npx", ["-y", "vercel", "domains", "inspect", DOMAIN]) ?? "(nedostupné)");
  } else {
    console.log("\nProměnné jsou nastavené. Nasazení: znovu s přepínačem --deploy.");
  }
}

main();
