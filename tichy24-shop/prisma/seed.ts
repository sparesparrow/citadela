import path from "node:path";
import bcrypt from "bcryptjs";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

// Seed bezi primo pres tsx, takze .env nenacte prisma.config.ts —
// nacteme ho stejnym zpusobem sami, jeste nez se postavi klient.
try {
  process.loadEnvFile(path.join(process.cwd(), ".env"));
} catch {
  // .env neexistuje — spolehame na promenne prostredi.
}

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }),
});

/** Kategorie jsou soucasti obchodu, ne demo — vznikaji vzdy. */
const categories = [
  { slug: "werkzeug", name: "Werkzeug", sortOrder: 1 },
  { slug: "ersatzteile", name: "Ersatzteile", sortOrder: 2 },
  { slug: "pflege", name: "Pflege & Schmierstoffe", sortOrder: 3 },
  { slug: "zubehoer", name: "Zubehör", sortOrder: 4 },
];

/**
 * Demo katalog. ZASTUPNA DATA — nazvy, ceny i sklad jsou vymyslene, aby
 * obchod pri vyvoji nebyl prazdny. SKU zacina `DEMO-`, takze se daji
 * pred spustenim jednim dotazem najit a smazat. Vznikaji jen s
 * SEED_DEMO_PRODUCTS=1 a na produkci se nesmi spoustet.
 */
const demoProducts = [
  {
    cat: "werkzeug", sku: "DEMO-W-001", slug: "drehmomentschluessel-1-2-zoll",
    name: "Drehmomentschlüssel 1/2\", 40–210 Nm",
    summary: "Klickschlüssel mit Ratsche für Radmuttern und Fahrwerk.",
    description: "Der Klicker meldet das Erreichen des eingestellten Drehmoments deutlich.\n\nLieferung im Kunststoffkoffer. Vor Lagerung auf den kleinsten Wert zurückdrehen.",
    priceCents: 8990, stock: 12,
  },
  {
    cat: "werkzeug", sku: "DEMO-W-002", slug: "steckschluesselsatz-94-teilig",
    name: "Steckschlüsselsatz 94-teilig",
    summary: "1/4\"- und 1/2\"-Antrieb mit Ratschen, Nüssen und Bits.",
    description: "Der Grundstock für Werkstatt und Garage.\n\nIm stabilen Koffer, jede Grösse beschriftet.",
    priceCents: 11900, stock: 8,
  },
  {
    cat: "werkzeug", sku: "DEMO-W-003", slug: "rangierwagenheber-2-t",
    name: "Rangierwagenheber 2 t",
    summary: "Flacher Wagenheber mit Schnellhub und Überlastschutz.",
    description: "Tragfähigkeit 2 Tonnen. Nur zum Anheben – Fahrzeug immer zusätzlich mit Unterstellböcken sichern.",
    priceCents: 12900, stock: 5,
  },
  {
    cat: "werkzeug", sku: "DEMO-W-004", slug: "oelfilterschluessel-set",
    name: "Ölfilterschlüssel-Set, 3-teilig",
    summary: "Kappen-, Band- und Kettenschlüssel für fast jeden Filter.",
    description: "Drei Varianten, damit jeder Filter – auch ein festsitzender – aufgeht.",
    priceCents: 2490, stock: 20,
  },
  {
    cat: "ersatzteile", sku: "DEMO-E-001", slug: "wischerblaetter-set",
    name: "Wischerblätter-Set 600/450 mm",
    summary: "Flachbalken-Wischer für Fahrer- und Beifahrerseite.",
    description: "Passend je nach Fahrzeug – bitte Fahrzeugdaten angeben oder vorher nachfragen.",
    priceCents: 2250, stock: 30,
  },
  {
    cat: "ersatzteile", sku: "DEMO-E-002", slug: "gluehlampen-sortiment",
    name: "Glühlampen-Sortiment H7 / H4 / W5W",
    summary: "Die gängigsten Ersatzlampen im Set für unterwegs.",
    description: "Praktisch fürs Handschuhfach. Prüfen Sie vor dem Wechsel die vorgeschriebene Lampenart für Ihr Fahrzeug.",
    priceCents: 1890, stock: 25,
  },
  {
    cat: "pflege", sku: "DEMO-P-001", slug: "motoroel-5w-30-5-l",
    name: "Motoröl 5W-30 Longlife, 5 l",
    summary: "Vollsynthetisches Leichtlauföl für viele moderne Motoren.",
    description: "Freigaben des Herstellers vor dem Kauf mit der Betriebsanleitung abgleichen.",
    priceCents: 6490, stock: 18,
  },
  {
    cat: "pflege", sku: "DEMO-P-002", slug: "bremsenreiniger-500-ml",
    name: "Bremsenreiniger 500 ml",
    summary: "Entfettet und trocknet rückstandsfrei.",
    description: "Für Bremsscheiben, Beläge und Teile, die sauber und trocken sein müssen. Nicht auf Gummi oder Kunststoff sprühen.",
    priceCents: 790, stock: 40,
  },
  {
    cat: "pflege", sku: "DEMO-P-003", slug: "kettenspray-400-ml",
    name: "Kettenspray 400 ml",
    summary: "Haftet bei hoher Drehzahl, wirft kaum ab.",
    description: "Kette vor dem Auftragen reinigen und trocknen.",
    priceCents: 1150, stock: 3,
  },
  {
    cat: "zubehoer", sku: "DEMO-Z-001", slug: "nitril-handschuhe-100-stk",
    name: "Nitril-Handschuhe schwarz, 100 Stk.",
    summary: "Öl- und fettbeständig, puderfrei.",
    description: "Grösse L. Für Arbeiten mit Ölen, Fetten und Reinigern.",
    priceCents: 1490, stock: 50,
  },
  {
    cat: "zubehoer", sku: "DEMO-Z-002", slug: "led-arbeitsleuchte",
    name: "LED-Arbeitsleuchte, wiederaufladbar",
    summary: "Magnet und Haken, 3 Helligkeitsstufen.",
    description: "Per USB-C aufladbar. (Demo: absichtlich ausverkauft, um die Anzeige zu zeigen.)",
    priceCents: 3490, stock: 0,
  },
];

async function main() {
  const email = (process.env.ADMIN_EMAIL ?? "admin@tichy24.ch").toLowerCase();
  const password = process.env.ADMIN_PASSWORD;
  if (!password || password.length < 8) {
    throw new Error("Nastavte ADMIN_PASSWORD (alespon 8 znaku) v .env pred spustenim seedu.");
  }

  const passwordHash = await bcrypt.hash(password, 12);
  await prisma.adminUser.upsert({
    where: { email },
    update: { passwordHash },
    create: { email, name: "Shop-Verwaltung", passwordHash },
  });
  console.log(`Admin: ${email}`);

  for (const c of categories) {
    await prisma.category.upsert({ where: { slug: c.slug }, update: { name: c.name, sortOrder: c.sortOrder }, create: c });
  }
  console.log(`Kategorie: ${categories.length}`);

  if (process.env.SEED_DEMO_PRODUCTS !== "1") {
    console.log("Demo produkty preskoceny (nastavte SEED_DEMO_PRODUCTS=1).");
    return;
  }

  const byslug = new Map((await prisma.category.findMany()).map((c) => [c.slug, c.id]));
  for (const { cat, ...p } of demoProducts) {
    await prisma.product.upsert({
      where: { sku: p.sku },
      update: p,
      create: { ...p, categoryId: byslug.get(cat)! },
    });
  }
  console.log(`Demo produkty: ${demoProducts.length}`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
