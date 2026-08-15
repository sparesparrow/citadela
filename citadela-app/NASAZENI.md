# Nasazení na citadela-resort.cz

Cíl: veřejný web a rezervace na `https://citadela-resort.cz`, hosting Vercel,
databáze Neon (Postgres), doména a DNS zůstávají ve Wedosu.

Doména je registrovaná ve Wedosu (objednávka 3126353710, expirace 15. 8. 2027)
a používá jeho DNS servery (`ns.wedos.com` a spol.). **Nameservery neměníme** —
do zóny jen přidáme dva záznamy. Wedos tak dál drží mail a případné další
záznamy a Vercel řeší jen web.

---

## 0. Co je potřeba mít

| Účet | K čemu | Cena |
| --- | --- | --- |
| [Neon](https://neon.tech) | Postgres | free tier stačí (0,5 GB) |
| [Vercel](https://vercel.com) | hosting Next.js | Hobby zdarma; komerční provoz vyžaduje Pro, 20 $/měs. |
| GitHub (`sparesparrow/citadela`) | zdroj pro deploy | — |
| Wedos (už máte) | DNS | — |

---

## 1. Databáze na Neonu

1. Nový projekt, region **Europe (Frankfurt)** — sedí k `fra1` ve `vercel.json`,
   takže dotazy nechodí přes oceán.
2. Zkopírujte **pooled** connection string (ten s `-pooler` v hostname).
   Serverless funkce se škálují po desítkách instancí; přímé spojení by
   vyčerpalo limit Neonu.
3. Řetězec musí končit `?sslmode=require`. Když nekončí, aplikace se úmyslně
   odmítne spustit (`src/lib/prisma.ts`) — lepší chyba při startu než heslo
   posílané v otevřeném spojení.

Výsledek vypadá takto:

```
postgresql://neondb_owner:HESLO@ep-neco-12345-pooler.eu-central-1.aws.neon.tech/neondb?sslmode=require
```

Schéma se vytvoří samo při prvním buildu — `vercel-build` spouští
`prisma migrate deploy` nad migrací `prisma/migrations/20260815000000_init`.

---

## 2. Projekt na Vercelu

**New Project** → import `sparesparrow/citadela`.

| Nastavení | Hodnota |
| --- | --- |
| Framework | Next.js (detekuje se sám) |
| **Root Directory** | **`citadela-app`** |
| Build Command | ponechte výchozí — použije se `vercel-build` z `package.json` |
| Node.js Version | 20.x nebo 22.x |

Root Directory je jediná věc, kterou Vercel neuhodne — repozitář má v kořeni
brandové podklady a aplikace leží o úroveň níž.

### Proměnné prostředí

Vložte do **Settings → Environment Variables**, scope **Production**
(a `Preview`, pokud chcete funkční náhledy PR — pak ale na jinou databázi):

| Proměnná | Hodnota |
| --- | --- |
| `DATABASE_URL` | pooled řetězec z Neonu (krok 1) |
| `AUTH_SECRET` | vygenerujte, viz níže |
| `AUTH_URL` | `https://citadela-resort.cz` |
| `AUTH_TRUST_HOST` | `true` |
| `CRON_SECRET` | vygenerujte, viz níže |
| `ADMIN_EMAIL` | vaše adresa pro přihlášení do administrace |
| `ADMIN_PASSWORD` | silné heslo — použije se jen při seedu |
| `BOOKING_HOTEL_PATH` | `cz/citadela` |
| `BOOKING_AID` | affiliate ID z partner.booking.com (lze doplnit později) |
| `BOOKING_ICAL_URLS` | iCal exporty z Extranetu (lze doplnit později) |
| `ACCESS_EVENT_RETENTION_DAYS` | `90` |

`AUTH_SECRET` a `CRON_SECRET` si vygenerujte a vložte **rovnou do Vercelu**.
Do repozitáře nepatří — proto tu nejsou vypsané:

```bash
node -e "const c=require('crypto');console.log('AUTH_SECRET='+c.randomBytes(32).toString('base64'));console.log('CRON_SECRET='+c.randomBytes(32).toString('hex'))"
```

`AUTH_URL` musí být apex bez `www` a bez lomítka na konci — slouží zároveň
jako `metadataBase` pro OG tagy, takže nesedící hodnota rozbije náhledy odkazů
na Facebooku a v Messengeru.

`CRON_SECRET` má na Vercelu dvojí roli: chrání `/api/cron/*` a Vercel ho sám
posílá v hlavičce `Authorization: Bearer …` u naplánovaných běhů. Naplánované
úlohy jsou ve `vercel.json` — synchronizace Bookingu každou hodinu, mazání
`AccessEvent` ve 3:30. **Na Hobby plánu běží cron jen jednou denně**; hodinová
synchronizace kalendáře vyžaduje Pro, jinak hrozí dvojí rezervace na termín,
který Booking mezitím prodal.

---

## 3. Doména a DNS ve Wedosu

Na Vercelu: **Settings → Domains → Add** → `citadela-resort.cz`.
Vercel nabídne přidat i `www.citadela-resort.cz` — přidejte obojí, `www` pak
přesměruje na apex.

Vercel u každé domény zobrazí kartu s **konkrétními hodnotami**. Opište je,
neopisujte z návodů na internetu — CNAME je pro každý projekt jiný
(typicky `d1d4fc829fe7bc7c.vercel-dns-017.com`) a A záznam se u novějších
projektů liší (`216.198.79.1` u nových, `76.76.21.21` u starších).

Pak ve Wedosu: **Domains → citadela-resort.cz → Edit DNS Records**
(nebo levé menu **DNS citadela-resort.cz → DNS records**) a přidejte:

| Název | Typ | Hodnota | TTL |
| --- | --- | --- | --- |
| *(prázdné = apex)* | `A` | IP z karty na Vercelu | 300 |
| `www` | `CNAME` | hodnota z karty na Vercelu (s tečkou na konci) | 300 |

Nízké TTL 300 s je záměr pro první dny — kdyby bylo potřeba něco přepnout,
projeví se to za pět minut, ne za den. Až bude web stát, můžete zvednout na 3600.

Ve Wedosu se změny zóny **potvrzují tlačítkem, které publikuje celou zónu**
(„Save changes" a potom publikace) — bez toho se záznam uloží, ale nezveřejní.

Certifikát vystaví Vercel automaticky (Let's Encrypt), obvykle do pár minut
po propsání DNS.

### Když se certifikát nevystaví

Zkontrolujte, jestli v zóně není `CAA` záznam, který Let's Encrypt nepovoluje.
Buď ho smažte, nebo přidejte:

```
citadela-resort.cz.  CAA  0 issue "letsencrypt.org"
```

---

## 4. První spuštění administrace

Migrace proběhly při buildu, ale databáze je prázdná — není v ní účet personálu.
Ze svého počítače, s produkčním `DATABASE_URL` v prostředí:

```bash
cd citadela-app
DATABASE_URL="postgresql://…?sslmode=require" ADMIN_EMAIL="vy@example.cz" ADMIN_PASSWORD="…" npm run db:seed
```

**Bez `SEED_DEMO_ACCESS=1`** — ta proměnná zakládá demo pobyt, čtečky, koloběžky
a přístupové karty. Na produkci by to znamenalo funkční přihlašovací údaje
k dveřím, které nikomu nepatří.

---

## 5. Kontrola po nasazení

```bash
curl -sI https://citadela-resort.cz/ | head -3          # 307 na /cs nebo /en
curl -s  https://citadela-resort.cz/cs | grep -o "<title>.*</title>"
curl -sI https://citadela-resort.cz/en | head -1        # 200
curl -s  https://citadela-resort.cz/api/ical | head -3  # BEGIN:VCALENDAR
```

Ruční spuštění naplánovaných úloh (stejné, co dělá Vercel Cron):

```bash
curl -s "https://citadela-resort.cz/api/cron/sync?secret=$CRON_SECRET"
curl -s "https://citadela-resort.cz/api/cron/retention?secret=$CRON_SECRET"
```

Přihlášení do administrace: `https://citadela-resort.cz/cs/admin`.

---

## 6. Co doladit až web běží

- **Google OAuth** — v Google Cloud Console přidat redirect URI
  `https://citadela-resort.cz/api/auth/callback/google`. Dokud nejsou
  `AUTH_GOOGLE_ID` i `AUTH_GOOGLE_SECRET` nastavené, tlačítko se schová a
  přihlášení personálu jede přes heslo. Nic to nerozbíjí.
- **Booking.com** — do `BOOKING_ICAL_URLS` iCal exporty z Extranetu
  (Rates & Availability → Sync calendars) a do Extranetu naopak vložit
  `https://citadela-resort.cz/api/ical`, aby Booking neprodal termín
  obsazený přímou rezervací.
- **Zálohy** — Neon drží point-in-time restore 7 dnů na free tieru. Pro ostrý
  provoz s reálnými rezervacemi je to málo.
- **Mail na doméně** — Wedos dál drží zónu, takže MX záznamy můžete přidat
  kdykoli, nezávisle na Vercelu.
