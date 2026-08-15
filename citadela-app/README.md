# Citadela Resort — web s dvojjazyčností, přihlášením a napojením na Booking.com

Next.js 15 (App Router) · TypeScript · Prisma 7 · Auth.js v5

Dvojjazyčný web (čeština / angličtina) pro **Citadela Resort**, Za Humny 262,
664 34 Rozdrojovice — celá vila pro až 40 osob nad Brněnskou přehradou.
Osm ložnic, čtyři společenské prostory, wellness s bazénem 29 °C, finskou
a infra saunou a whirlpoolem.

Web obsahuje prezentaci objektu, ceník s podmínkami a storny, poptávkový
formulář se skutečným uložením do databáze, přihlášení hostů přes Google,
oddělené přihlášení pro personál a obousměrnou synchronizaci obsazenosti
s Booking.com přes iCal.

**Objekt se pronajímá vcelku** — ložnice se nenabízejí jednotlivě. V datech
proto existuje jediná pronajímaná jednotka (`UNIT = "villa"` v `src/lib/booking.ts`)
a jeden kalendář obsazenosti.

---

## Rychlý start

```bash
npm install
cp .env.example .env      # a vyplňte, viz níže
npm run db:push           # vytvoří schéma v Postgresu (musí běžet)
npm run db:seed           # založí administrátorský účet
npm run dev               # http://localhost:3000
```

Kořenová adresa `/` přesměruje na `/cs` nebo `/en` podle jazyka prohlížeče.

---

## Proměnné prostředí

| Proměnná | Povinná | K čemu |
|---|---|---|
| `DATABASE_URL` | ano | Připojení k Postgresu. Ve vývoji např. `postgresql://citadela:citadela@localhost:5432/citadela`, na produkci s `?sslmode=require`. |
| `AUTH_SECRET` | ano | Podpis relací. Vygenerujte `openssl rand -base64 32`. |
| `AUTH_URL` | v produkci | Veřejná adresa webu, např. `https://citadela.cz`. |
| `AUTH_GOOGLE_ID` / `AUTH_GOOGLE_SECRET` | pro Google login | Z Google Cloud Console. |
| `ADMIN_EMAIL` / `ADMIN_PASSWORD` | pro seed | Účet personálu, vytvoří `npm run db:seed`. |
| `BOOKING_AID` | doporučeno | Affiliate ID z partner.booking.com, připojí se ke všem odkazům. |
| `BOOKING_HOTEL_PATH` | ano | Cesta objektu, např. `cz/citadela`. |
| `BOOKING_ICAL_URLS` | pro synchronizaci | iCal exporty z Extranetu, oddělené čárkou. |
| `CRON_SECRET` | pro automatiku | Chrání `/api/cron/sync`. |

`.env` nikdy nedávejte do gitu — `.gitignore` ho už vylučuje.

### Google OAuth

1. Google Cloud Console → **APIs & Services → Credentials → OAuth client ID → Web**
2. Authorized redirect URI:
   - vývoj: `http://localhost:3000/api/auth/callback/google`
   - produkce: `https://vase-domena.cz/api/auth/callback/google`
3. Client ID a secret vložte do `.env`.

---

## Booking.com

Booking.com **nemá veřejné API** — přístup k Demand API dostávají jen schválení
partneři a registrace jsou momentálně pozastavené. Zároveň **neexistuje
„přihlášení přes Booking.com" pro hosty**; jejich OAuth2 slouží majitelům
ubytování k autorizaci aplikací vůči Extranetu.

Projekt proto používá cestu, která funguje hned a bez schvalování — stejnou,
jakou volí i affiliate mikrostránky typu worhot.com:

**1. Deep-linky s affiliate ID**
`src/lib/booking.ts` staví odkazy ve tvaru
`https://www.booking.com/hotel/cz/citadela.html?aid=…&checkin=…&checkout=…&group_adults=…`.
Rezervace tak proběhne na Booking.com s okamžitým potvrzením a s korektně
přiřazenou zásluhou.

**2. Příchozí iCal — obsazenost z Booking.com**
V Extranetu: *Ceny a dostupnost → Synchronizace kalendářů* → zkopírujte adresu
exportu do `BOOKING_ICAL_URLS`. Formát podporuje obojí:

```
BOOKING_ICAL_URLS="https://ical.booking.com/a.ics,https://ical.booking.com/b.ics"
BOOKING_ICAL_URLS="tower=https://ical.booking.com/a.ics,citadel=https://…"
```

Protože se vila pronajímá vcelku, obvykle stačí jedna adresa bez prefixu.
Zápis `slug=url` je tam pro případ, že by bylo někdy potřeba držet víc
kalendářů zvlášť.

**3. Odchozí iCal — přímé rezervace zpět do Booking.com**
`GET /api/ical` vydává kalendář potvrzených přímých poptávek. Adresu vložte
v Extranetu do importu kalendářů, aby Booking neprodal obsazený termín.
Volitelně `?room=tower` pro jeden pokoj.

**4. Automatická synchronizace**
`POST /api/cron/sync` s `?secret=<CRON_SECRET>` nebo hlavičkou
`Authorization: Bearer <CRON_SECRET>`. Například Vercel Cron:

```json
{ "crons": [{ "path": "/api/cron/sync?secret=…", "schedule": "0 */3 * * *" }] }
```

Ručně z terminálu: `npm run sync:booking`. Ze správy: tlačítko *Synchronizovat nyní*.

---

## Přihlašování

| Kdo | Jak | Kam |
|---|---|---|
| Host | Google | `/cs/login` — poptávky se navážou na účet |
| Personál | e-mail + heslo (bcrypt, 12 kol) | `/cs/login?staff=1` → `/cs/admin` |
| Host s rezervací na Booking.com | odkaz do jeho účtu | Booking nenabízí SSO pro třetí strany |

Administrace je chráněná dvakrát: middleware (rychlý filtr na edge) a znovu
v serverovém layoutu přes `requireAdmin()`. Přihlášení personálu záměrně
porovnává hash i u neexistujícího e-mailu, aby doba odpovědi neprozradila,
které účty existují.

---

## Jazyky

Slovníky jsou v `src/dictionaries/{cs,en}.ts`. Angličtina definuje typ
`Dictionary`, čeština se proti němu kontroluje — **chybějící nebo přebývající
klíč shodí build**, takže se překlad nemůže rozejít.

Volba jazyka: cookie `citadela_locale` → jazyk prohlížeče → čeština.
Přepínač v hlavičce mění URL (`/cs` ↔ `/en`), takže je každá jazyková verze
samostatně indexovatelná a sdílitelná. Nastaveno `hreflang` i `x-default`.

---

## Struktura

```
prisma/schema.prisma     datový model (User, Inquiry, BlockedDate, SyncLog)
prisma.config.ts         Prisma 7 — připojení a migrace
src/middleware.ts        volba jazyka + první bariéra administrace
src/auth.config.ts       edge-safe část Auth.js (bez Prisma a bcryptu)
src/auth.ts              plná konfigurace: Google + personál
src/lib/booking.ts       deep-linky, čtení i generování iCal
src/lib/site.ts          data o objektu: ložnice, vybavení, ceník, storna
src/dictionaries/        cs.ts, en.ts
src/app/[locale]/        web, přihlášení, administrace
src/app/api/             auth, poptávky, iCal, synchronizace
```

---

## Nasazení

Produkce běží na `https://citadela-resort.cz` — Vercel (root directory
`citadela-app`), Postgres na Neonu, doména a DNS ve Wedosu. Postup krok za
krokem včetně DNS záznamů a proměnných prostředí je v **[NASAZENI.md](NASAZENI.md)**.

Vercel spouští `vercel-build`, ne `build` — navíc proti němu pouští
`prisma migrate deploy`. Změna schématu se proto musí odeslat jako migrace
v `prisma/migrations/`, samotné `db push` se na produkci nedostane.

Naplánované úlohy jsou ve `vercel.json`: synchronizace kalendáře Bookingu
každou hodinu, mazání záznamů o přístupech ve 3:30. Autorizuje je `CRON_SECRET`,
který Vercel posílá v hlavičce `Authorization`.

---

## Než pustíte web ven

- [ ] `ADMIN_PASSWORD` změnit a po seedu z `.env` smazat
- [ ] `AUTH_SECRET` vygenerovat nový, nepoužívat vývojový
- [x] Postgres i ve vývoji — `provider = "postgresql"`, adaptér `@prisma/adapter-pg`
- [ ] Doplnit skutečné fotografie — předejte je do `<Gallery photos={…} />`
- [ ] Nahradit zástupné recenze v `sampleReviews` skutečnými z Booking.com
      a přepnout `reviewsArePublishable` na `true`
- [ ] Ověřit hodnocení v `bookingScore` proti Booking.com
- [ ] Rozhodnout rozpory ve zdrojovém textu (viz níž) a srovnat je v `site.ts`
- [ ] Doplnit odesílání e-mailů (`TODO` v `src/app/api/inquiries/route.ts`)
- [ ] Nahradit in-memory rate limit Redisem, běží-li víc instancí
- [x] Retence záznamů o přístupech — `POST /api/cron/retention`,
      naplánujte stejně jako synchronizaci kalendáře
- [ ] Doplnit stránky *Ochrana údajů* a *Podmínky* (GDPR)
- [ ] Cookie lištu, pokud přibude analytika

---

## Rozpory ve zdrojovém textu

Při přepisu obsahu jsem narazil na tři místa, která si odporují. Zvolil jsem
uvedenou variantu, ale rozhodnutí je na vás:

| Co | V textu | Na webu |
|---|---|---|
| Kapacita | 35 osob v popisu, 40 v podmínkách, cena pro 25 | 40 s cenou pro 25 osob |
| Délka týdne | „týdenní pobyt zahrnuje 6 nocí" vs. „od neděle do neděle" (7 nocí) | 6 nocí |
| Sezóny | letní, zimní i mimosezónní cena je shodně 85 000 Kč | jedna cena „Týden" |

Počet ložnic také nevycházel: vypsáno bylo sedm, ale text zmiňuje 8 ložnic
a v odstavci o vytápění se objevuje „zlatý pokoj". Doplnil jsem tedy Zlatý
pokoj jako osmou ložnici — zkontrolujte prosím jeho popis v `src/lib/site.ts`
a ve slovnících.

## Ověřeno

- `tsc --noEmit` prochází nad všemi zdrojovými soubory
- `npm test` — 85 testů čisté logiky (`npm test`):
  - Booking.com: `expandDates`, `bookingUrl`, `icalTargets`, `buildIcal`
    včetně kolečka tam a zpět přes `node-ical`
  - přístupový systém: rozhodovací pravidla, podpisy Ed25519, přehrání, posun hodin
  - retence, formátování cen a dat
- `npm run build` proběhne i bez souboru `.env` (jen s proměnnými prostředí)
- Regrese přístupového systému proti běžícímu serveru:
  `npx tsx scripts/ci-reader-check.ts` — 11 kontrol
- Kontrast barev spočítán proti WCAG 2.1 AA, dvě barvy opraveny

Vše výše běží i v CI, viz `.github/workflows/ci.yml`.

**Netestováno:** API routy mimo čtečky, uživatelské rozhraní (postup ručního
ověření je v `TESTING.md`), přihlášení Googlem a skutečný NFC hardware.
