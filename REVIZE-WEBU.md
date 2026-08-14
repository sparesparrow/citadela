# Revize webu Citadela Resort

Kontrola původního `citadela-website.html` (383 řádků, jeden soubor) a soupis
toho, co je v nové aplikaci opraveno a co ještě stojí za pozornost.
Každé zjištění je ověřené v kódu, ne odhad.

---

## Shrnutí

Původní web byl vizuálně velmi dobrý — art-deco identita, poctivá typografie,
originální grafika bez licenčních problémů. Slabiny byly jinde: **nebyl
použitelný na mobilu, formulář nic neodesílal a nedal se ovládat klávesnicí,
a pro vyhledávače byl prakticky neviditelný.**

Ve srovnání s [hotel-u-sulaka.worhot.com](https://hotel-u-sulaka.worhot.com/)
chyběly navíc přesně ty sekce, které u ubytování rozhodují o rezervaci: pokoje
s cenami, seznam vybavení, recenze a poloha.

| | Původní | Nový |
|---|---|---|
| Jazyky | jen anglicky, `lang="en"` | čeština + angličtina, autodetekce |
| Formulář | nic neodesílá | ukládá do databáze, hlídá obsazenost |
| Mobilní navigace | mizí bez náhrady | hamburger + sticky sekční lišta |
| SEO | 0 meta tagů | popis, OG, JSON-LD, hreflang |
| Booking.com | žádné napojení | deep-linky + obousměrný iCal |
| Sekce | 5 | 12 |
| Ceník | žádný | 4 sazby + podmínky a storna |

---

## Kritické — opraveno

### 1. Formulář nebyl formulář
```
<form>: 0×   for=: 0×   name= u inputů: 0×   autocomplete: 0×
```
Nebyl tam element `<form>`. Popisky nebyly svázané s poli přes `for`/`id`,
takže čtečka obrazovky u pole neřekne, co se do něj má psát. Pole neměla
`name`, takže i kdyby se odesílalo, nedorazilo by nic. Tlačítko jen na 3,2 s
změnilo vlastní text.

**Nyní:** skutečný `<form>` s validací na klientu i na serveru (Zod), popisky
svázané s poli, `autocomplete` (`name`, `email`, `tel`), `inputmode`,
honeypot proti robotům, limit 5 odeslání / 10 minut na IP, a kontrola proti
obsazenosti staženého z Booking.com — obsazený termín vrátí 409 a formulář to
hostovi srozumitelně řekne.

### 2. Na mobilu se nedalo navigovat
```css
@media(max-width:900px){ nav{display:none} }
```
Pod 900 px zmizely odkazy na Arrival, Suites, Journey i Reserve — bez náhrady.
Na telefonu, odkud chodí většina návštěv ubytování, zbylo jen scrollování.

**Nyní:** tlačítko menu otevírá nativní `<dialog>` (Esc i kliknutí mimo,
s fallbackem pro Safari) a pod hero sekcí je sticky lišta *Apartmá · Vybavení ·
Recenze · Kontakt*, převzatá ze struktury worhot.

### 3. Formulářová pole neměla viditelný fokus
```css
.field input,.field select{ … outline:none; … }
```
`outline:none` bez náhrady je selhání WCAG 2.4.7. Kdo ovládá web klávesnicí,
nevidí, kde se nachází.

**Nyní:** `:focus-visible` s obrysem 2 px ve zlaté napříč celým webem a odkaz
„Přejít k obsahu" na první Tab.

### 4. Bez JavaScriptu byl web prázdný
```css
.reveal{ opacity:0; transform:translateY(30px); }
```
Vše pod hero sekcí startovalo neviditelné a zviditelnil to až
IntersectionObserver. Když se skript nenačte, zůstane návštěvníkovi jen hero.
Zároveň nikde nebyl `prefers-reduced-motion` (0 výskytů) — kdo má v systému
omezené animace, dostal je stejně.

**Nyní:** animace jsou v CSS přes `animation-timeline: view()`, běží na
kompozitoru a jsou zabalené v `@media (prefers-reduced-motion: no-preference)`.
Obsah je viditelný ve výchozím stavu. Pro Firefox, který scroll-driven animace
zatím neumí, je fallback přes IntersectionObserver.

### 5. Sedmkrát stejné SVG ID
```
id="f": 7×   id="glow": 7×
```
V jednom dokumentu musí být `id` unikátní. Všech sedm SVG odkazovalo na
`url(#f)` a prohlížeč použije první nález — fungovalo to jen shodou okolností,
protože všechny gradienty byly identické. Jakmile by se jeden odlišil, rozbilo
by se to nepředvídatelně.

**Nyní:** každá instance grafiky si generuje vlastní ID.

---

## Vysoká priorita — opraveno

### 6. Web byl pro vyhledávače neviditelný
```
meta description: 0    Open Graph: 0    JSON-LD: 0    canonical: 0    hreflang: 0
```
Žádný popis ve výsledcích vyhledávání, žádný náhled při sdílení na sociálních
sítích, žádná strukturovaná data. Pro ubytování, které soupeří s Booking.com
o stejné dotazy, je to zásadní.

**Nyní:** `description`, Open Graph, `hreflang` pro obě jazykové verze
i `x-default`, kanonické adresy a JSON-LD typu `Hotel` s adresou, souřadnicemi,
časy příjezdu a odjezdu a kompletním vybavením — to je podklad pro bohatší
výsledky vyhledávání.

### 7. `lang="en"` na českém webu
Deklarovaná angličtina na stránce s českými názvy míst zhorší výslovnost ve
čtečkách a mate automatický překlad.

**Nyní:** `lang` odpovídá zvolené jazykové verzi.

### 8. Kontrast dvou barev nesplňoval WCAG AA
Spočítáno proti podkladu `#0A0A0A`:

| Barva | Poměr | Malý text AA (4,5:1) |
|---|---|---|
| `#F3ECDD` krémová | 16,83:1 | vyhovuje |
| `#CFC6B2` tlumená | 11,67:1 | vyhovuje |
| `#E7CE84` světlé zlato | 12,78:1 | vyhovuje |
| `#C9A84C` zlatá | 8,66:1 | vyhovuje |
| `#9A7E32` tmavé zlato | 5,10:1 | vyhovuje |
| `#7D7566` copyright | **4,34:1** | **nevyhovuje** |
| `#6B6450` placeholder | **3,36:1** | **nevyhovuje** |

**Nyní:** opraveno na `#807B73` (4,71:1) a `#807A6B` (4,63:1). Paleta zůstala
vizuálně stejná, jen o odstín světlejší tam, kde to bylo potřeba.

### 9. Fonty z Google CDN
Dva požadavky na `fonts.googleapis.com` blokovaly vykreslení a navíc posílaly
IP adresu návštěvníka Googlu — v EU je to věc, kterou se GDPR zabývá.

**Nyní:** `next/font` fonty stáhne při buildu a servíruje z vlastní domény.
Žádný požadavek třetí strany, žádné poskakování textu.

---

## Co přibylo podle vzoru worhot

Struktura převzatá z hotel-u-sulaka.worhot.com, oblečená do identity Citadely:

- **Odznaky vybavení** hned pod hero — šest nejsilnějších argumentů s ikonami
- **Karty osmi ložnic** s počtem osob, koupelnou a výbavou
- **Úplný seznam vybavení** (28 položek)
- **Ceník** se čtyřmi sazbami, podmínkami a storno tabulkou
- **Půjčovna** elektrických koloběžek a chopperu
- **Hodnocení z Booking.com** s odkazem na recenze
- **Mapa a vzdálenosti** (centrum Brna, Veveří, letiště, břeh)
- **Fotogalerie** s lightboxem, připravená na skutečné snímky
- **Sticky sekční navigace**

Cesta k rezervaci je stejná jako u worhot: deep-link s affiliate ID
(`?aid=…&checkin=…&checkout=…`), tedy okamžité potvrzení přes Booking.com —
plus navíc přímá poptávka bez provize.

---

## Doporučení, která jsem neprovedl

Tohle jsou rozhodnutí, která patří vám.

**1. Doplnit zbytek fotografií**
Čtyři fotky ze složky `photos` jsem už zapojil — letecký exteriér do hero
sekce, bazén k popisu domu, finskou saunu do wellness a koupelnu ke Stříbrnému
pokoji. Zbývá sedm ložnic, společenská místnost s kulečníkem, letní kuchyně
a zahrada. Přidávají se do `photos` v `src/lib/site.ts`, přiřazení
k ložnicím řídí `bedroomPhotos`.

Fotka exteriéru je denní a světlá, kdežto identita je černo-zlatá. Hero proto
dostalo silnější závoj (`.hero[data-photo="true"]::after`), aby zlatý logotyp
zůstal čitelný. Až budete fotit, večerní nebo podvečerní snímky sednou značce
výrazně lépe.

**2. Recenze zatím nezveřejňuji**
V `src/lib/site.ts` jsou zástupné hodnoty a `reviewsArePublishable = false`.
Vymyslet za vás výroky hostů by bylo zavádějící vůči návštěvníkům. Až budete
mít skutečné recenze z Booking.com, doplňte je a přepněte na `true`.
Totéž platí pro `bookingScore` — 9,1 ze 128 recenzí je zástupné číslo.

**3. Srovnat rozpory ve zdrojovém textu**
Kapacita se v předloze uvádí třemi čísly (35 v popisu, 40 v podmínkách, cena
pro 25). Web uvádí 40 s cenou pro 25. Dále: „týden = 6 nocí" neodpovídá
„od neděle do neděle" (7 nocí) a letní, zimní i mimosezónní cena je shodně
85 000 Kč, takže rozdělení sezón na webu nic neříká. A vypsáno bylo sedm
ložnic, ačkoli text mluví o osmi — Zlatý pokoj jsem doplnil podle zmínky
v odstavci o vytápění, zkontrolujte jeho popis.

**4. Odesílání e-mailů**
Poptávka se uloží, ale nikomu nepřijde upozornění. V
`src/app/api/inquiries/route.ts` je označené místo — nabízí se Resend nebo
SendGrid, pár řádků.

**5. GDPR**
Odkazy *Ochrana údajů* a *Podmínky* v zápatí zatím nikam nevedou. Formulář
sbírá jméno, e-mail a telefon, takže tyhle stránky mít musíte. Cookie lišta
je potřeba až s analytikou — teď žádné sledovací cookie nenasazujeme.

**6. Postgres místo SQLite**
SQLite je skvělé pro vývoj. Na produkci (zvlášť na Vercelu, kde je souborový
systém dočasný) přejděte na Postgres — Neon nebo Supabase mají štědrý free
tarif. V README je postup, jsou to dvě změny.

**7. Rate limit v paměti**
Limit poptávek drží proces v paměti. Při jedné instanci to stačí; při více
nebo na serverless nasaďte Redis (Upstash).

**8. Ověřit právní stránku adults-only pozicování**
Web mluví o dospělých hostech diskrétně, mezi řádky. Pokud budete objekt
inzerovat i na Booking.com, projděte si jejich pravidla pro obsah — explicitní
formulace tam mohou být problém. Zvažte také, zda podmínky pobytu nemají
výslovně řešit počet osob, noční klid a odpovědnost za škodu.

**9. Zvážit channel manager**
Až přibudou další portály (Airbnb, Expedia), iCal začne být křehký —
synchronizuje se po intervalech a umí jen obsazenost, ne ceny. Beds24 nebo
Smoobu řeší obojí obousměrně za pár set korun měsíčně.

---

## Čím je to podložené

- `tsc --noEmit` prochází nad všemi zdrojovými soubory
- Slovníky mají shodných 250 klíčů; chybějící překlad shodí build
- 12 testů logiky Booking.com — počítání nocí, deep-linky, generování iCal
  podle RFC 5545 včetně escapování a zalamování řádků
- Kontrastní poměry spočítané podle vzorce WCAG 2.1
- Postupy pro animace, dialogy a formuláře podle příručky moderního webu

Produkční `next build` se v prostředí, kde web vznikal, nepodařilo spustit —
instalaci balíčku `next` tam nešlo dokončit. Spusťte prosím lokálně
`npm install && npm run build`.
