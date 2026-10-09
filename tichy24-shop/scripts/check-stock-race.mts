/**
 * Dukaz, ze posledni kusy zbozi nejdou prodat dvakrat.
 *
 * Scenar: produkt ma skladem 3 kusy a 12 zakazniku soubezne objedna po 1 ks.
 * Jedine spravne vysledky: presne 3 objednavky uspeji, 9 dostane
 * OutOfStockError a sklad skonci na nule — ne na zapornem cisle.
 * Kdyby se sklad nacitel a porovnaval v aplikaci, preprodalo by se.
 *
 *   npm run check:stock          (potrebuje bezici Postgres a DATABASE_URL)
 */

import path from "node:path";
try {
  process.loadEnvFile(path.join(process.cwd(), ".env"));
} catch {
  // spoleháme na promenne prostredi
}

// Dynamicke importy: `src/lib/prisma` cte DATABASE_URL hned pri nacteni.
const { prisma } = await import("../src/lib/prisma");
const { placeOrder, changeOrderStatus, OutOfStockError } = await import("../src/lib/orders");

const MARKER = "stock-race-check";
let failures = 0;
function check(name: string, ok: boolean, detail?: unknown) {
  if (ok) console.log(`  ok   ${name}`);
  else {
    failures += 1;
    console.error(`  FAIL ${name}`);
    if (detail !== undefined) console.error(`       ${JSON.stringify(detail)}`);
  }
}

const customer = {
  name: "Race Check",
  email: `${MARKER}@example.test`,
  phone: null,
  deliveryMethod: "PICKUP" as const,
  paymentMethod: "CASH_ON_PICKUP" as const,
  street: null, postalCode: null, city: null, country: null, note: MARKER,
};

async function cleanup() {
  await prisma.order.deleteMany({ where: { note: MARKER } });
  await prisma.product.deleteMany({ where: { sku: MARKER } });
}

try {
  await cleanup();
  const category = await prisma.category.upsert({
    where: { slug: "race-check" },
    update: {},
    create: { slug: "race-check", name: "Race check" },
  });
  const product = await prisma.product.create({
    data: {
      slug: MARKER, sku: MARKER, name: "Race check", summary: "-", description: "-",
      priceCents: 1000, stock: 3, categoryId: category.id,
    },
  });

  console.log("Souběžné objednávky na poslední 3 kusy:");
  const results = await Promise.allSettled(
    Array.from({ length: 12 }, () => placeOrder(customer, [{ productId: product.id, quantity: 1 }])),
  );
  const ok = results.filter((r) => r.status === "fulfilled");
  const outOfStock = results.filter((r) => r.status === "rejected" && r.reason instanceof OutOfStockError);
  const other = results.filter((r) => r.status === "rejected" && !(r.reason instanceof OutOfStockError));

  check("přesně 3 objednávky uspějí", ok.length === 3, { ok: ok.length });
  check("zbylých 9 dostane OutOfStockError", outOfStock.length === 9, { outOfStock: outOfStock.length });
  check("žádná jiná chyba", other.length === 0, other.map((r) => String((r as PromiseRejectedResult).reason)));

  const after = await prisma.product.findUniqueOrThrow({ where: { id: product.id } });
  check("sklad skončí přesně na 0 (ne záporný)", after.stock === 0, { stock: after.stock });

  console.log("Atomicita více řádků:");
  await prisma.product.update({ where: { id: product.id }, data: { stock: 2 } });
  const second = await prisma.product.create({
    data: {
      slug: `${MARKER}-b`, sku: `${MARKER}-b`, name: "Race check B", summary: "-", description: "-",
      priceCents: 500, stock: 1, categoryId: category.id,
    },
  });
  const partial = await placeOrder(customer, [
    { productId: product.id, quantity: 2 },
    { productId: second.id, quantity: 5 },
  ]).then(() => "ok", (e) => (e instanceof OutOfStockError ? "out" : String(e)));
  const afterA = await prisma.product.findUniqueOrThrow({ where: { id: product.id } });
  check("objednávka s nedostupným řádkem selže", partial === "out", { partial });
  check("a sklad prvního řádku se vrátil (transakce)", afterA.stock === 2, { stock: afterA.stock });

  console.log("Storno vrací sklad právě jednou:");
  const order = await placeOrder(customer, [{ productId: product.id, quantity: 2 }]);
  const [c1, c2] = await Promise.all([
    changeOrderStatus(order.id, "CANCELLED"),
    changeOrderStatus(order.id, "CANCELLED"),
  ]);
  const afterCancel = await prisma.product.findUniqueOrThrow({ where: { id: product.id } });
  check("jedno storno projde, druhé je odmítnuto", [c1, c2].sort().join() === "invalid_transition,ok", { c1, c2 });
  check("sklad je zpět na 2, ne na 4", afterCancel.stock === 2, { stock: afterCancel.stock });

  await prisma.product.delete({ where: { id: second.id } }).catch(() => {});
} finally {
  await cleanup().catch(() => {});
  await prisma.category.deleteMany({ where: { slug: "race-check" } }).catch(() => {});
  await prisma.$disconnect();
}

if (failures > 0) {
  console.error(`\n${failures} kontrol selhalo.`);
  process.exit(1);
}
console.log("\nVše v pořádku.");
