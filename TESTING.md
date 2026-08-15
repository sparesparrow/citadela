# TESTING.md

How to verify Citadela Resort — written so **Claude Code can execute it directly** using the
integrated Chrome browser (`mcp__Claude_Browser__*`), without improvising.

Three layers, in order of speed:

| Layer | Command | Covers |
|---|---|---|
| Static | `npm run typecheck` | types, dictionary key parity |
| Unit | `npm test` | pure logic (`src/lib`) — 85 tests |
| Reader | `npx tsx scripts/ci-reader-check.ts` | signed NFC endpoints — 11 assertions |
| Browser | this document | UI, forms, auth, responsive |

The first three run automatically in CI on every push and pull request
(`.github/workflows/ci.yml`). Only the browser layer needs a human — or Claude.

> **Nepouštějte `npm run build`, dokud běží `npm run dev`.** Build přepíše `.next` pod
> běžícím serverem a ten pak hlásí `ENOENT … vendor-chunks/*.js` na každý požadavek.
> Léčba: server zastavit, smazat `.next`, spustit znovu.

---

## 0. Reset to a known state

Browser assertions below depend on seeded fixtures. To reset:

```bash
cd citadela-app && rm -f prisma/dev.db && npm run db:push && SEED_DEMO_ACCESS=1 npm run db:seed
```

That produces: the admin account from `.env`, stay `DEMO-2026-001` (CHECKED_IN, guests
*Jana Nováková*/gold and *Petr Novák*/silver), 8 bedroom door readers plus `door-entrance`,
`door-wellness`, `dock-garage`, scooters `SC-01`/`SC-02`, one CARD and one PHONE credential,
and `scripts/.devices.json` with the private keys the simulator needs.

---

## 1. Static and unit layers

```bash
cd citadela-app && npm run typecheck && npm test
```

Expected: no `tsc` output, 85 tests passing across five files (access rules, device crypto,
Booking.com iCal, retention, i18n formatting).

Run a single file or a single test:

```bash
npx vitest run src/lib/access.test.ts
```

```bash
npx vitest run -t "zamitne hosta do cizi loznice"
```

---

## 2. Reader layer (signed NFC endpoints)

Needs a running dev server. The browser **cannot** test these — it can't produce Ed25519
signatures — so the simulator is the only tool for `/api/access/*` and `/api/rental/*`.

**In CI, or to check everything at once**, use the assertion script — it prints a pass/fail
line per check and exits non-zero on the first failure:

```bash
cd citadela-app && npx tsx scripts/ci-reader-check.ts
```

For poking at one case by hand, the simulator prints the full response:

```bash
cd citadela-app && npx tsx scripts/simulate-reader.ts door-gold card
```

| Command | Expected |
|---|---|
| `door-gold card` | `allowed: true` |
| `door-silver card` | `wrong_room` |
| `door-wellness card` | `allowed: true` (common area) |
| `door-silver phone` | `allowed: true` |
| `door-gold card --replay` | second call HTTP **409** `replayed_nonce` |
| `door-gold card --skew 300` | HTTP **401** `clock_skew` |
| `dock-garage phone --rent SC-01` | `allowed: true` + `rentalSessionId` |
| `dock-garage phone --rent SC-02` | `rental_already_open` |
| `dock-garage phone --end <id> --battery 72` | `minutes`, `amountCents` |
| same `--end` again | `already_closed`, **no second charge** |

The last four are the ones that matter most: replay, skew, double-rental, and idempotent
return. Set `SIMULATE_BASE_URL` if the dev server took a port other than 3000.

---

## 3. Browser layer — Claude-executable checklist

### Setup

```
preview_start({ name: "citadela-dev" })
```

`.claude/launch.json` defines `citadela-dev` (runs `npm --prefix citadela-app run dev` on
port 3000). If port 3000 is occupied Next will pick another — check `preview_logs` for the
actual URL before asserting.

**Prefer `read_page` over screenshots** for asserting text and structure; it returns an
accessibility tree with `ref_N` handles and is both faster and more reliable than pixels.

**After every step**, run `read_console_messages({ onlyErrors: true })` and treat any result
as a failure, not a warning.

### 3.1 Locale routing

1. `navigate({ url: "http://localhost:3000" })` → final URL must be `/cs` or `/en`
   (middleware picks from `Accept-Language`, defaulting to `cs`).
2. `navigate({ url: ".../en" })` → `read_page` shows `<html lang="en">`.
3. Click the language switch in the header → URL toggles, and
   `javascript_tool: document.cookie` contains `citadela_locale`.

### 3.2 Homepage renders

`navigate` to `/cs`, then `read_page({ filter: "interactive" })`. Assert the reserve form,
gallery strip, and section nav are all present. Console errors must be empty.

### 3.3 Reserve form — happy path

`find` the arrival/departure/name/email/guests fields, fill with `form_input` (arrival =
tomorrow, departure = arrival + 2), submit. Assert:
- `get_page_text` contains the success string (`dict.reserve.form.success`), and
- `read_network_requests({ urlPattern: "/api/inquiries" })` shows **201**.

### 3.4 Reserve form — the three rejection paths

These are the valuable ones; the happy path rarely breaks alone.

| Case | How | Expected |
|---|---|---|
| Honeypot | `read_page` to get the `#website` ref (it is `visually-hidden` + `aria-hidden`, **not** `display:none`, so it is still targetable), `form_input` any value, submit | **400** `invalid` |
| Too many guests | the `<select>` only offers up to `site.maxGuests` (40), so POST directly via `javascript_tool` `fetch` with `guests: 99` | **422** `too_many_guests` |
| Unavailable | choose dates overlapping the seeded `BlockedDate` — the demo seed blocks 3 days starting 10 days from today, and prints the range | **409** `unavailable` |

### 3.5 Gallery lightbox (keyboard)

Click the first `.gallery-item` → `read_page` shows `<dialog open>`. Press `ArrowRight` twice
via `computer({ action: "key" })` → the counter text advances. Press `Escape` → dialog closes.

### 3.6 Staff authentication

`navigate` to `/cs/login?staff=1`, fill `ADMIN_EMAIL` / `ADMIN_PASSWORD` from `.env`, submit →
redirected to `/cs/admin`, and `read_page` shows the admin heading with that email.

Note: the Google sign-in button is **intentionally absent** unless `AUTH_GOOGLE_ID` and
`AUTH_GOOGLE_SECRET` are both set. Its absence is correct behaviour, not a bug.

### 3.7 Admin dashboards

- `/cs/admin` — stat grid renders; seeded inquiry rows visible.
- `/cs/admin/access` — stay `DEMO-2026-001`, both scooters, 11 readers, and the audit table
  populated by whatever simulator runs happened in §2. Denied rows should show
  `data-tone="bad"` pills.
- Signed out, `/cs/admin/access` must **307** to `/cs/login?...&staff=1`.

### 3.8 Responsive

`resize_window({ preset: "mobile" })` (375 px), reload `/cs`. Assert:
- the nav collapses to a menu button, and
- no horizontal overflow:
  `javascript_tool: document.documentElement.scrollWidth <= document.documentElement.clientWidth`.

Repeat at `tablet`. Reload after each resize so load-time device gates re-run.

### 3.9 Theme

`globals.css` sets `color-scheme: dark` and the design is committed to dark. Set
`resize_window({ colorScheme: "light" })` then `"dark"`, reloading each time, and assert via
`getComputedStyle` that the body background stays in the `#0a0a0a` family both times — the
site must never flash light.

---

## 4. What is *not* covered

Be honest about these rather than assuming green means safe:

- **API routes other than the reader and inquiry endpoints** — no automated coverage; only
  the manual browser steps above.
- **The admin UI** — renders, but nothing in it mutates data yet (TODO area A).
- **Google OAuth** — cannot be exercised without real credentials.
- **Real NFC hardware** — the simulator proves the protocol, not the RF loop. Full HCE
  verification needs a physical Android phone plus a PC/SC reader (ACR122U / PN532) or a
  second phone in reader mode.
- **Email** — not implemented at all yet.
