# tichy24.ch — e-shop

Německy psaný (de-CH) e-shop pro **Dušana Tichého — „Ihr Allrounder-Mechaniker“**.
Katalog, košík, pokladna bez účtu, potvrzení objednávky a administrace objednávek a produktů.

Zatím žije v repozitáři `citadela` jako samostatná složka, později se odděluje (viz
[Oddělení z repozitáře](#oddělení-z-repozitáře)). **Se `citadela-app` nesdílí žádný kód** —
postupy jsou převzaté a zkopírované, ne importované.

## Doména

Kontrola `tichy24.ch` proběhla **2026-10-09** proti registru .ch (RDAP, `rdap.nic.ch`):

| Dotaz | Výsledek |
|---|---|
| `tichy24.ch` | **404 – v registru není** (nezaregistrována) |
| `admin.ch`, `tichy.ch` (kontrola, že dotaz funguje) | 200 – registrovány |
| DNS `tichy24.ch`, `www.tichy24.ch` | bez záznamu |

Doména tedy **vypadá volná**, ale nic jsem nezaregistroval — to musí udělat majitel u registrátora
(Infomaniak, Hostpoint, cyon, Metanet…). Před registrací si dostupnost potvrďte ještě ve formuláři
registrátora; stav se mohl od kontroly změnit. Registrovat je rozumné hned — jméno je napsané na
nálepce, takže ho může kdokoli zkusit zabrat.

Po registraci: v hostingu nastavte `SITE_URL=https://tichy24.ch` a směrujte DNS (postup viz
`citadela-app/NASAZENI.md`, stejný model: Vercel + Neon).

## Příkazy

```bash
cd tichy24-shop
cp .env.example .env            # doplnit AUTH_SECRET (openssl rand -base64 32)
docker compose up -d            # Postgres (v dev taky — žádný SQLite)
npm install
npm run db:migrate              # schéma
SEED_DEMO_PRODUCTS=1 npm run db:seed   # admin + kategorie + demo produkty
npm run dev                     # http://localhost:3000

npm run typecheck
npm test                        # čistá logika (src/lib)
npm run check:stock             # souběh nad skutečnou DB (potřebuje Postgres)
npm run build
```

Admin: `/admin` (účet z `ADMIN_EMAIL` / `ADMIN_PASSWORD` v seedu).

## Architektura

Next.js 15 (App Router), React 19, Prisma 7 + Postgres, Auth.js v5 (jen admin), Zod, Vitest.
Bez webfontů, bez trackingu, bez knihovny pro stav košíku — nakupovat jde i bez JavaScriptu.

| Oblast | Kde | Poznámka |
|---|---|---|
| Texty | `src/dictionaries/de.ts` | Typ `Dictionary` = `typeof de`; další jazyk (fr/it) se deklaruje `: Dictionary` a chybějící klíč shodí typecheck. Slovník obsahuje funkce → klientským komponentám se předávají jen hotové řetězce. |
| Obchodní konstanty | `src/lib/pricing.ts` | MwSt (8,1 %), poštovné, limity. Čistý modul, používá ho i klientský formulář pokladny. |
| Identita a kontakt | `src/lib/site.ts` | Texty právních stránek se z něj skládají. |
| Peníze | `src/lib/money.ts` | Vše v **Rappen** (`...Cents`), nikdy float. |
| Košík | `src/lib/cart.ts`, `cart-store.ts`, `cart-view.ts` | V cookie jen `{id, počet}`; **ceny se vždy čtou z DB**. |
| Pokladna | `src/lib/checkout.ts`, `src/app/actions.ts` | Validace vrací kódy chyb, texty doplňuje server. Honeypot proti botům. |
| Objednávky | `src/lib/orders.ts`, `order-status.ts` | Viz níže. |
| Admin | `src/app/admin/`, `src/auth*.ts`, `src/middleware.ts` | Middleware chrání jen `/admin/*` (veřejný katalog jím neprochází); každá mutace navíc volá `requireAdmin()`. |

**Sklad se nesmí prodat dvakrát.** `placeOrder()` odečítá jedním `UPDATE … WHERE stock >= n`
v jedné transakci; při souběhu druhý požadavek podmínku vyhodnotí znovu a neprojde. Totéž
u storna (`updateMany` s podmínkou na původní stav → sklad se vrací právě jednou).
`npm run check:stock` to dokazuje: z 12 souběžných objednávek na 3 kusy uspějí přesně 3.

### Co je převzaté z `citadela-app`

Stejný stack a konvence, protože je bude spravovat stejný člověk: Postgres i ve vývoji,
`prisma.config.ts` s `DATABASE_URL_UNPOOLED` pro migrace, adaptér `pg` v `src/lib/prisma.ts`,
`serverExternalPackages`, typovaný slovník, peníze v celých jednotkách, rozdělení auth na
edge-safe a Prisma část s dummy hashem proti odhalení existujících účtů, `requireAdmin()`
„podruhé“ v serveru, race-safe zápis přes podmíněný zápis v DB, čisté moduly s testy,
kontrolní skript nad skutečnou DB, `vercel-build` s `prisma migrate deploy`.

**Záměrně jinak:** žádné locale v URL (zatím jen němčina), žádný Google login ani Prisma adaptér
(zákazníci nemají účet, admin je jen e-mail + heslo), žádný `AccessEvent`/retence (neukládáme
pohyb osob; objednávky se v CH uchovávají 10 let, Art. 958f OR).

## Před spuštěním

Dokud `SHOP_LIVE` není `1`, web posílá `noindex` a `robots.txt` zakazuje vše. Zapněte ho až po:

- [ ] Registraci domény a nastavení `SITE_URL`.
- [ ] **Vyplnění údajů v `src/lib/site.ts`** — ulice, PSČ, obec, telefon, UID (`CHE-…`). Hodnoty
      v hranatých závorkách jsou zástupné a zobrazují se v Impressum, Kontaktu a AGB.
- [ ] **Právní revizi** `legal.*` v `src/dictionaries/de.ts` (Impressum, AGB, Datenschutz).
      Je to **vzor**, ne právní poradenství. Zkontrolujte hlavně: platební lhůtu 10 dní, vyloučení
      práva na odstoupení, odpovědnost, výčet zpracovatelů v Datenschutz (hosting, DB).
- [ ] Rozhodnutí, zda je obchod **plátcem MwSt** (obrat ≥ 100 000 CHF). Pokud ne, nastavte
      `VAT_RATE_BP = 0` v `pricing.ts` — texty i souhrny MwSt přestanou zobrazovat.
- [ ] Nastavení skutečného **poštovného** (`SHIPPING` v `pricing.ts` — 9,90 / zdarma od 150 jsou zástupné).
- [ ] `SHOP_IBAN` a `SHOP_BANK_HOLDER` (jinak se na potvrzení ukáže „Bankverbindung per E-Mail“).
- [ ] Smazání demo produktů: `DELETE … WHERE sku LIKE 'DEMO-%'` (nebo je v adminu skryjte),
      nahrání skutečných produktů a fotek. **Seed s `SEED_DEMO_PRODUCTS=1` na produkci nespouštět.**
- [ ] Změně `ADMIN_PASSWORD` z výchozí hodnoty.
- [ ] Nastavení proměnných v hostingu: `DATABASE_URL` (Neon, `?sslmode=require`),
      `DATABASE_URL_UNPOOLED`, `AUTH_SECRET`, `SITE_URL`, `SHOP_LIVE`, `SHOP_IBAN`.

## Známá omezení

- **Žádné e-maily.** Zákazník dostane potvrzení jen jako stránku (`/bestellung/<token>`) a obchod
  o nové objednávce zjistí v administraci. Chybí odesílání (např. Resend/Postmark) — je to první
  věc, kterou je třeba doplnit; AGB zatím mluví o „potvrzení objednávky“ obecně.
- **Žádná online platba.** Jen Vorkasse (převod) a hotovost při osobním převzetí. Další krok je
  Stripe Checkout nebo Payrexx s **TWINT** — ve Švýcarsku je to pro e-shop téměř nutnost.
  Rozšíření: nová hodnota `PaymentMethod`, webhook, který přepne stav na `PAID`.
- **Nezaplacené objednávky drží sklad.** Sklad se odečítá při objednání; AGB dává 10 dní na
  platbu, ale nic objednávku automaticky nezruší. Chybí cron (zrušit `NEW` + `PREPAYMENT` starší
  10 dní a vrátit sklad přes `changeOrderStatus`).
- **Žádné omezení počtu objednávek.** Je tu jen honeypot. Rate limit v paměti instance by na
  serverless nefungoval (stejně jako u `/api/inquiries` v citadele) — vhodné je sdílené úložiště
  nebo ochrana na úrovni platformy (Vercel Firewall).
- **Bez QR-faktury.** Švýcarský QR-bill by na potvrzení zlepšil Vorkasse; zatím jen IBAN + číslo
  objednávky jako účel platby.
- **Bez fotek produktů.** Do doby, než se nahraje `imageUrl`, se ukazuje piktogram kategorie.
  Obrázky se zadávají jako URL (`https`); vlastní upload by vyžadoval úložiště (např. Vercel Blob).
- Slogan na nálepce čtu jako „Ihr **Allrounder**-Mechaniker“ (na fotce je „Airounder“); zkontrolujte.

## Oddělení z repozitáře

Složka je soběstačná. Historii zachová:

```bash
git subtree split -P tichy24-shop -b tichy24-shop-only     # nebo: git filter-repo --subdirectory-filter tichy24-shop
```

Pak v novém repozitáři přesuňte `.github/workflows/tichy24-shop.yml` na `ci.yml` a odstraňte z něj
`paths:` a `defaults.run.working-directory`. V kořenovém `CLAUDE.md` citadely smažte odstavec
o `tichy24-shop/`.
