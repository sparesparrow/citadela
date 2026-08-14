import { writeFileSync } from "node:fs";
import path from "node:path";
import { generateKeyPairSync } from "node:crypto";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import bcrypt from "bcryptjs";
import { bedrooms } from "../src/lib/site";
import { generateDeviceKeyPair } from "../src/lib/device-auth";
import { generateCredentialPublicId } from "../src/lib/credential";

// Seed se spousti primo pres tsx (npm run db:seed), takze .env nenacte
// prisma.config.ts — nacteme ho tedy stejnym zpusobem sami, jeste nez
// se postavi klient.
try {
  process.loadEnvFile(path.join(process.cwd(), ".env"));
} catch {
  // .env neexistuje — spolehame na promenne prostredi.
}

const prisma = new PrismaClient({
  adapter: new PrismaBetterSqlite3({ url: process.env.DATABASE_URL! }),
});

async function main() {
  const email = (process.env.ADMIN_EMAIL ?? "admin@citadela.cz").toLowerCase();
  const password = process.env.ADMIN_PASSWORD;

  if (!password || password.length < 8) {
    throw new Error("Nastavte ADMIN_PASSWORD (alespoň 8 znaků) v .env před spuštěním seedu.");
  }

  const passwordHash = await bcrypt.hash(password, 12);

  const user = await prisma.user.upsert({
    where: { email },
    update: { passwordHash, role: "ADMIN" },
    create: { email, name: "Citadela concierge", passwordHash, role: "ADMIN" },
  });

  console.log(`Administrátor připraven: ${user.email}`);

  if (process.env.SEED_DEMO_ACCESS === "1") {
    await seedAccessDemo();
  } else {
    console.log("Přeskočeno demo přístupů. Zapněte SEED_DEMO_ACCESS=1.");
  }
}

/**
 * Demo data pro vývoj přístupového systému: jeden probíhající pobyt,
 * čtečky u všech ložnic, dvě koloběžky a přístupové prostředky.
 *
 * Privátní klíče čteček se zapíšou do scripts/.devices.json, aby se
 * proti nim dal spustit simulátor čtečky. Soubor je v .gitignore —
 * v produkci se privátní klíč nasype do zařízení a nikam se neukládá.
 */
async function seedAccessDemo() {
  // Pobyt, který právě běží — od včerejška do zítřka.
  const arrival = new Date();
  arrival.setDate(arrival.getDate() - 1);
  arrival.setHours(0, 0, 0, 0);

  const departure = new Date();
  departure.setDate(departure.getDate() + 2);
  departure.setHours(0, 0, 0, 0);

  const reference = "DEMO-2026-001";

  await prisma.stay.deleteMany({ where: { reference } });

  const stay = await prisma.stay.create({
    data: {
      reference,
      arrival,
      departure,
      status: "CHECKED_IN",
      guests: 4,
      note: "Demonstrační pobyt pro vývoj přístupového systému.",
      stayGuests: {
        create: [
          { name: "Jana Nováková", bedroomSlug: "gold", isPrimary: true },
          { name: "Petr Novák", bedroomSlug: "silver" },
        ],
      },
    },
    include: { stayGuests: true },
  });

  // --- čtečky -------------------------------------------------------------
  const devices: Record<string, { privateKey: string; label: string }> = {};

  async function createAccessPoint(input: {
    id: string;
    kind: "DOOR" | "SCOOTER_DOCK";
    label: string;
    bedroomSlug?: string | null;
    isCommon?: boolean;
  }) {
    const keys = generateDeviceKeyPair();
    devices[input.id] = { privateKey: keys.privateKey, label: input.label };

    return prisma.accessPoint.upsert({
      where: { id: input.id },
      update: { devicePublicKey: keys.publicKey, enabled: true },
      create: {
        id: input.id,
        kind: input.kind,
        label: input.label,
        bedroomSlug: input.bedroomSlug ?? null,
        isCommon: input.isCommon ?? false,
        devicePublicKey: keys.publicKey,
      },
    });
  }

  for (const bedroom of bedrooms) {
    await createAccessPoint({
      id: `door-${bedroom.slug}`,
      kind: "DOOR",
      label: `Ložnice ${bedroom.slug}`,
      bedroomSlug: bedroom.slug,
    });
  }

  await createAccessPoint({
    id: "door-entrance",
    kind: "DOOR",
    label: "Hlavní vchod",
    isCommon: true,
  });
  await createAccessPoint({
    id: "door-wellness",
    kind: "DOOR",
    label: "Wellness",
    isCommon: true,
  });

  const dock = await createAccessPoint({
    id: "dock-garage",
    kind: "SCOOTER_DOCK",
    label: "Stojan koloběžek — garáž",
  });

  // --- koloběžky ----------------------------------------------------------
  for (const code of ["SC-01", "SC-02"]) {
    await prisma.scooter.upsert({
      where: { code },
      update: { status: "AVAILABLE", dockId: dock.id },
      create: {
        code,
        status: "AVAILABLE",
        dockId: dock.id,
        // 20 Kč nástupní + 3 Kč/min, v haléřích.
        baseFeeCents: 2000,
        perMinuteCents: 300,
      },
    });
  }

  // --- přístupové prostředky ---------------------------------------------
  const validFrom = new Date(arrival);
  const validTo = new Date(departure);
  validTo.setHours(23, 59, 0, 0);

  const credentials: Record<string, { publicId: string; privateKey?: string }> = {};

  // Karta hlavního hosta. U karty nese důvěru čtečka, ne plast —
  // secretHash je tu jen párovací štítek konkrétního kusu.
  const primary = stay.stayGuests.find((g) => g.isPrimary)!;
  const cardPublicId = generateCredentialPublicId();
  await prisma.credential.create({
    data: {
      publicId: cardPublicId,
      type: "CARD",
      secretHash: `demo-card-${cardPublicId}`,
      label: "Karta — Jana Nováková",
      validFrom,
      validTo,
      stayGuestId: primary.id,
    },
  });
  credentials.card = { publicId: cardPublicId };

  // Telefon druhého hosta — Ed25519 pár jako z Android Keystore.
  const second = stay.stayGuests.find((g) => !g.isPrimary)!;
  const phoneKeys = generateKeyPairSync("ed25519");
  const phonePublicId = generateCredentialPublicId();
  await prisma.credential.create({
    data: {
      publicId: phonePublicId,
      type: "PHONE",
      secretHash: phoneKeys.publicKey.export({ type: "spki", format: "der" }).toString("hex"),
      label: "Telefon — Petr Novák",
      validFrom,
      validTo,
      stayGuestId: second.id,
    },
  });
  credentials.phone = {
    publicId: phonePublicId,
    privateKey: phoneKeys.privateKey.export({ type: "pkcs8", format: "der" }).toString("hex"),
  };

  const target = path.join(process.cwd(), "scripts", ".devices.json");
  writeFileSync(
    target,
    JSON.stringify(
      {
        note: "Vývojové klíče. Nikdy necommitovat, nikdy nepoužít v provozu.",
        devices,
        credentials,
        guests: {
          card: { name: primary.name, bedroomSlug: primary.bedroomSlug },
          phone: { name: second.name, bedroomSlug: second.bedroomSlug },
        },
      },
      null,
      2,
    ),
    "utf8",
  );

  console.log(`Demo pobyt ${reference}: ${stay.stayGuests.length} hosté, ${Object.keys(devices).length} čteček.`);
  console.log(`Klíče pro simulátor zapsány do scripts/.devices.json`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
