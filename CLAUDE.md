# CLAUDE.md

Pokyny pro AI asistenty pracující v tomto repozitáři. Psáno česky, protože
česky je psaná i veškerá ostatní dokumentace a komentáře v kódu — držte se
toho i vy.

---

## Co je to za repozitář

Dvě vrstvy, které spolu souvisejí jen obsahem, ne kódem:

1. **Kořen** — značka a statické podklady: brand book, plakát, původní
   jednosouborový web, texty, fotografie. Historický materiál, ze kterého
   aplikace vznikla.
2. **`citadela-app/`** — živá Next.js aplikace pro *Citadela Resort*
   (Za Humny 262, Rozdrojovice, nad Brněnskou přehradou). **Prakticky každý
   úkol se týká jí.**

```
README.md                       brand book: paleta, typografie, hlas značky
REVIZE-WEBU.md                  revize původního webu vs. nová aplikace (proč co vzniklo)
citadela-brand-guidelines.html  jednostránkový brand book (2,3 MB, samostatný)
citadela-website.html           PŮVODNÍ prototyp webu — nahrazen aplikací, needitovat
citadela-nahled-{cs,en}.html    statické náhledy nové aplikace
citadela-web-copy.md            původní marketingové texty (zdroj pro slovníky)
photos/, *.png                  fotografie a rendery loga/plakátu
token-pravdepodobnosti.py       nesouvisející pokus s ONNX/Qwen, mimo projekt
citadela-app/                   aplikace
```

`citadela-website.html` a náhledy jsou zmrazené artefakty. Nepromítejte do
nich změny aplikace, pokud o to někdo výslovně nepožádá.

---

## Zásobník

Next.js 15 (App Router, React 19) · TypeScript strict · Prisma 7
(driver adapter, SQLite ve vývoji) · Auth.js v5 · Zod 4 · Vitest 4.
Node ≥ 20.11. Žádný CSS framework — vlastní design systém v jednom
`globals.css`.

---

## Rychlý start

```bash
cd citadela-app
npm install
cp .env.example .env        # vyplnit alespoň DATABASE_URL a AUTH_SECRET
npx prisma generate         # NUTNÉ: klient se generuje do src/generated (v .gitignore)
npm run db:push             # vytvoří SQLite databázi podle schématu
npm run db:seed             # účet personálu z ADMIN_EMAIL / ADMIN_PASSWORD
npm run dev                 # http://localhost:3000 → přesměruje na /cs nebo /en
```

**Pozor na pořadí:** `prisma generate` čte `DATABASE_URL` přes
`prisma.config.ts`, takže bez `.env` selže. A dokud klient neexistuje,
`npm run typecheck` hlásí `Cannot find module '@/generated/prisma/client'`
— není to chyba v kódu, jen chybějící generování.

### Ověřovací smyčka

```bash
npm run typecheck    # tsc --noEmit — musí projít bez chyb
npm run test         # vitest run — 34 testů ve 2 souborech
npm run build        # prisma generate && next build
```

Testy běží i bez vygenerovaného klienta a bez databáze; typecheck a build ne.
Build stahuje písma přes `next/font/google`, takže potřebuje síť. V aktuálním
stromu prochází všechno trojí: typecheck bez chyb, 34 testů, `next build`
skončí úspěchem (`/[locale]` a `/[locale]/login` se předgenerují, administrace
a API běží dynamicky).

### Demo přístupového systému

```bash
SEED_DEMO_ACCESS=1 npm run db:seed        # pobyt, čtečky, koloběžky, karty
npx tsx scripts/simulate-reader.ts door-gold card
npx tsx scripts/simulate-reader.ts door-silver card          # → wrong_room
npx tsx scripts/simulate-reader.ts dock-garage phone --rent SC-01
npx tsx scripts/simulate-reader.ts dock-garage phone --end <rentalSessionId>
npx tsx scripts/simulate-reader.ts door-gold card --replay   # → 409 replayed_nonce
npx tsx scripts/simulate-reader.ts door-gold card --skew 300 # → clock_skew
```

Seed zapíše privátní klíče čteček do `scripts/.devices.json`
(v `.gitignore`). Simulátor je jediný způsob, jak vyzkoušet trasy pro
hraniční zařízení — nemají testy, jen se proti nim volá běžící server.

---

## Mapa aplikace

| Soubor | Za co odpovídá |
|---|---|
| `src/middleware.ts` | volba jazyka + první (levná) bariéra `/admin` |
| `src/auth.config.ts` | edge-safe část Auth.js — bez Prisma a bcryptu |
| `src/auth.ts` | plná konfigurace: Google + personál, `requireAdmin()` |
| `src/lib/prisma.ts` | singleton klienta s driver adapterem |
| `src/lib/i18n.ts` | slovníky, `formatPrice`, `formatDate`, `server-only` |
| `src/lib/site.ts` | **strukturální data objektu** — slugy, čísla, ceník, storna |
| `src/dictionaries/{en,cs}.ts` | **všechny texty**; `en` definuje typ, `cs` se proti němu kontroluje |
| `src/lib/booking.ts` | deep-linky na Booking.com, čtení i generování iCal |
| `src/lib/access.ts` | rozhodovací pravidla přístupu — čisté funkce, testované |
| `src/lib/device-auth.ts` | Ed25519 podpisy čteček, časové okno, nonce |
| `src/lib/credential.ts` | ověření karty / telefonu |
| `src/lib/reader-request.ts` | společný vstup tras volaných čtečkou |
| `src/lib/access-admin.ts` | načtení přehledu pro administraci |
| `src/app/[locale]/` | web, `login`, `admin`, `admin/access` |
| `src/app/api/` | `auth`, `inquiries`, `ical`, `cron/sync`, `access/authorize`, `rental/{start,end}` |
| `src/app/globals.css` | celý design systém (≈1100 řádků, tokeny v `:root`) |
| `prisma/schema.prisma` | datový model |
| `prisma/seed.ts` | administrátor + volitelné demo přístupů |
| `scripts/simulate-reader.ts` | simulátor čtečky |
| `scripts/sync-booking.ts` | ruční synchronizace kalendáře |

### Dvě domény v jedné aplikaci

**Prezentace a poptávky** — veřejný web, formulář ukládá `Inquiry`,
obousměrná synchronizace obsazenosti s Booking.com přes iCal.

**Přístupový systém** — potvrzený pobyt (`Stay`), hosté na pobytu
(`StayGuest`), jejich karty a telefony (`Credential`), čtečky
(`AccessPoint`), koloběžky, výpůjčky a účet pobytu (`FolioItem`).
Ovládají ho hraniční zařízení přes `/api/access/authorize`,
`/api/rental/start` a `/api/rental/end`.

Spojka mezi doménami je zatím tenká: `Inquiry` → `Stay` je nepovinná
vazba a nic ji automaticky nevytváří.

---

## Nepřekročitelná pravidla domény

Tohle jsou rozhodnutí, ne náhody. Neobcházejte je, aniž byste se zeptali.

**Vila se pronajímá vcelku.** Ložnice se nenabízejí jednotlivě. V datech
existuje jediná pronajímaná jednotka `UNIT = "villa"`
(`src/lib/booking.ts`) a jeden kalendář obsazenosti. `Inquiry.roomSlug` je
proto vždy `"villa"`; slugy ložnic (`BedroomSlug`) slouží jen přístupovému
systému a prezentaci.

**Peníze jsou v haléřích, jako `Int`.** `amountCents`, `baseFeeCents`,
`perMinuteCents`. Nikdy pohyblivá řádová čárka. Zobrazení řeší
`formatCents()` z `src/lib/access-admin.ts`.

**Přístup se rozhoduje fail-closed.** `decideAccess()` při jakékoli
pochybnosti zamítá. Důvody zamítnutí jsou výčet (`DENY_REASONS`), ne volný
text — zapisují se do `AccessEvent.reason` a personál podle nich pozná, co
se stalo. Nový důvod = nová položka výčtu + test.

**UID karty není tajemství.** Autorizace nikdy nestojí na identifikátoru
prostředku, vždy na čerstvé výzvě-odpovědi. U telefonu ověřuje podpis
server (`verifyPhoneProof`), u karty provede výzvu-odpověď čtečka a server
věří jejímu podpisu zařízení. V databázi záměrně neleží nic, čím by šlo
vyrobit funkční kopii.

**Každý požadavek od čtečky je podepsaný.** Hlavičky `X-Device-Id`,
`X-Timestamp`, `X-Nonce`, `X-Signature` nad `"timestamp.nonce.body"`,
Ed25519, tolerance hodin 60 s, nonce se pamatuje 300 s. Podpis se ověřuje
nad **přesnými bajty těla** — proto `authenticateReader()` vrací `rawBody`
a routy parsují ten, místo aby si tělo načetly znovu.

**Audit je append-only.** Do `AccessEvent` se zapisuje každé přiložení,
povolené i zamítnuté. Je to pohyb osoby po budově, tedy osobní údaj —
zacházejte s ním podle toho.

**Texty patří do slovníků, čísla do `site.ts`.** V komponentách žádné
napevno psané české ani anglické věty. `en.ts` je zdroj typu `Dictionary`
(záměrně bez `as const`), `cs.ts` se proti němu kontroluje — chybějící
nebo přebývající klíč shodí typecheck. Přidávejte klíč vždy do obou.

**Administrace je chráněná dvakrát.** Middleware odfiltruje na edge,
serverová stránka si to znovu ověří přes `requireAdmin()`. Nikdy
nespoléhejte jen na middleware.

**Prisma 7 zvláštnosti.** Připojovací řetězec žije v `prisma.config.ts`, ne
ve schématu. Klient jde do `src/generated/prisma` (v `.gitignore`).
Připojení běží přes driver adapter — `better-sqlite3` je nativní modul, a
proto je v `next.config.ts` v `serverExternalPackages`; neodstraňujte ho.
V `prisma/` **nejsou migrace** — pracuje se přes `prisma db push`.

**Klientských komponent je šest** a poznáte je podle `"use client"`:
`Header`, `Gallery`, `ReserveForm`, `AuthForms`, `RevealFallback`,
`SyncPanel`. Všechno ostatní jsou serverové komponenty. Do klientské
komponenty **nesmí projít funkce v props** — proto server rozbaluje
`dict.reserve.form` do hotových řetězců a polí (viz `page.tsx` a komentář
u `ReserveFormLabels`).

---

## Konvence psaní kódu

- **Komentáře česky a k *proč*, ne k *co*.** Kód v tomhle repozitáři
  vysvětluje svá rozhodnutí — když měníte chování, upravte i vysvětlení.
  Diakritika je v komentářích nekonzistentní (novější soubory bez háčků);
  držte se stylu souboru, který upravujete.
- **Zod na každé hranici.** Každé tělo požadavku se validuje schématem;
  neúspěch vrací `{ error: "invalid" }` a 400.
- **Chybové stavy jsou strojové řetězce** (`credential_revoked`,
  `rate_limited`, `unavailable`), ne věty pro člověka. Překlad si udělá
  klient.
- **Žádný CSS framework, žádné inline styly.** Používejte tokeny a třídy
  z `globals.css` (`--gold`, `--surface-2`, `.pill[data-tone]`, `.plate`…).
  Nová barva se přidává jako token, ne jako literál.
- **Přístupnost není volitelná.** Viditelný `:focus-visible`, `aria-label`
  u ovládacích prvků, respektovaný `prefers-reduced-motion`, kontrast
  proti WCAG 2.1 AA. `REVIZE-WEBU.md` popisuje, co se opravovalo — ať to
  nespadne zpátky.
- **Testuje se jen čistá logika.** `vitest.config.ts` sbírá
  `src/**/*.test.ts`; testy nesmí potřebovat databázi ani HTTP. Routy se
  ověřují proti běžícímu serveru simulátorem.

---

## Návody na časté úkoly

**Nový text na webu** → přidat klíč do `src/dictionaries/en.ts`, pak
`cs.ts`. Typecheck ohlídá, že jste nezapomněli.

**Nový údaj o objektu (číslo, slug, cena)** → `src/lib/site.ts`, popisek
k němu do slovníků.

**Nové pravidlo přístupu** → čistá funkce v `src/lib/access.ts`, nový
`DenyReason` do výčtu, test v `access.test.ts`. Route se nemění.

**Nová trasa volaná čtečkou** → začít `authenticateReader(request)`,
parsovat `authed.rawBody`, na konci zapsat `AccessEvent`. Nikdy si
neověřujte podpis vlastní cestou.

**Změna schématu** → upravit `prisma/schema.prisma`, spustit
`npm run db:push` a `npx prisma generate`, doplnit seed, projet typecheck.

**Změna vzhledu** → `src/app/globals.css`; sekce jsou oddělené
komentářovými pruhy, tokeny nahoře v `:root`.

---

## Bezpečnost a co nedělat

- Necommitovat `.env` ani `scripts/.devices.json` (obsahuje privátní klíče
  čteček). Obojí je v `.gitignore` — nechte to tak.
- Nezapisovat do repozitáře skutečné `AUTH_SECRET`, `CRON_SECRET`,
  `BOOKING_AID` ani hesla.
- Neoslabovat fail-closed logiku kvůli pohodlí při ladění.
- Přihlášení personálu záměrně porovnává hash i u neexistujícího e-mailu,
  aby doba odpovědi neprozradila existující účty — nezkracujte to.
- `/api/cron/sync` pustí dovnitř buď platný `CRON_SECRET`, nebo
  přihlášeného administrátora. Obojí musí zůstat.
- Přesměrování po přihlášení přijímá jen vlastní cesty (`callbackUrl`
  začínající `/` a ne `//`) — ochrana proti otevřenému přesměrování.

---

## Známé mezery

Věci, které v kódu chybí schválně nebo zatím. Nehlaste je jako objev,
řešte je, jen když o to někdo požádá.

- `src/app/api/inquiries/route.ts` — `TODO`: odeslání potvrzovacího
  e-mailu hostovi i concierge.
- Rate limit poptávek je in-memory (`Map`). Při více instancích je nutný
  Redis / Upstash.
- `sampleReviews` v `site.ts` jsou zástupná data, `reviewsArePublishable`
  je `false`. Nezveřejňovat, dokud nedorazí skutečné recenze z Booking.com.
- Produkce chce Postgres: `provider = "postgresql"` ve schématu a
  `@prisma/adapter-pg` v `src/lib/prisma.ts`.
- `UsedNonce` a `AccessEvent` nikdo neuklízí — retenční dávka zatím
  neexistuje, přestože se na ni komentář ve schématu odvolává.
- Chybí stránky *Ochrana údajů* a *Podmínky* (GDPR) a cookie lišta.
- `citadela-app/README.md` je v jednom místě neaktuální: mluví o dvanácti
  testech logiky Booking.com. Ty ve stromu nejsou — testy pokrývají
  `src/lib/access.ts` a `src/lib/device-auth.ts` (34 testů celkem),
  zatímco `expandDates`, `bookingUrl`, `buildIcal` a `icalTargets` jsou
  bez testů.
- Rozpory ve zdrojových textech (kapacita 35 / 40, délka týdne 6 / 7 nocí,
  počet ložnic 7 / 8) jsou rozhodnuté v `site.ts`; seznam je na konci
  `citadela-app/README.md`.

---

## Práce s gitem

Vyvíjí se na větvi zadané v úkolu, nikdy se netlačí přímo do `main`.
Pull request zakládejte jen na výslovnou žádost.
