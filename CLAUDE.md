# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository shape

The repo root holds **brand assets and standalone HTML** (`citadela-brand-guidelines.html`,
`citadela-website.html`, poster/logo PNGs, `citadela-web-copy.md`, `REVIZE-WEBU.md`).
These are self-contained documents, not part of any build.

The actual application is **`citadela-app/`** — all commands below run from there.

Note: the root `README.md` describes numbered asset folders (`01-logos/`, `02-identity/`, …)
that do not exist; the assets are loose files in the root. The README is a brand document,
not an accurate file map.

## Commands

```bash
cd citadela-app
npm install
npm run dev          # http://localhost:3000  (/ redirects to /cs or /en)
npm run typecheck    # tsc --noEmit
npm test             # vitest run
npm run build        # prisma generate && next build
```

Database (**Postgres, in dev too** — a server must be running):

```bash
npm run db:push                       # apply schema to dev.db
npm run db:seed                       # admin account from ADMIN_EMAIL/ADMIN_PASSWORD
SEED_DEMO_ACCESS=1 npm run db:seed    # + demo stay, readers, scooters, credentials
```

Single test file / single test:

```bash
npx vitest run src/lib/access.test.ts
npx vitest run -t "zamitne hosta do cizi loznice"
```

Prisma CLI needs `DATABASE_URL` in the environment; `prisma.config.ts` loads `.env`
explicitly because Prisma 7 no longer does. `npm run db:seed` runs through `tsx` and
loads `.env` itself for the same reason.

## Language and conventions

**The codebase is Czech.** Comments, commit-worthy prose, dictionary keys' values, and
user-facing strings are Czech; identifiers are English. Match this — write new comments
in Czech, in the existing explanatory register (they say *why*, not *what*).

Czech diacritics appear in `.tsx`/dictionary content but source comments in newer files
use unaccented Czech. Follow whichever the surrounding file does.

## Architecture

### Bilingual routing

Everything user-facing lives under `src/app/[locale]/` with `locale ∈ {cs, en}`.
`src/middleware.ts` picks the locale (cookie `citadela_locale` → `Accept-Language` → `cs`)
and redirects locale-less paths. Its `matcher` **excludes `/api`**, so API routes are never
locale-redirected and must handle their own auth.

`src/dictionaries/en.ts` ends with `export type Dictionary = typeof en`, and `cs.ts` is
declared `: Dictionary`. A missing or extra key in either language fails `typecheck` —
this is the translation safety net, so don't loosen those types.

**Dictionaries contain functions** (`common.imageOf`, `reserve.form.guestsOption`,
`admin.inquiries.nights`, `bedrooms.items[…].sleeps`). React cannot serialize functions
across the server/client boundary, so **never pass `dict` wholesale to a Client Component.**
Pass the narrow slice it needs, and resolve any functions on the server first
(see `ReserveForm`/`Gallery` call sites in `src/app/[locale]/page.tsx`).
`Omit<>` does not help — a spread still copies the function at runtime; destructure it out.

### Single-unit domain model

The villa rents **as a whole**, never per room: `UNIT = "villa"` in `src/lib/booking.ts`,
one occupancy calendar, capacity `site.maxGuests`. `src/lib/site.ts` is the structural
source of truth (bedrooms, amenities, rates, cancellation tiers) — text lives in dictionaries,
numbers and slugs live here. `BedroomSlug` from `site.ts` is the canonical room identifier
and is reused as the door↔room mapping in the access system.

### Booking.com integration

Booking.com has no usable public API, so `src/lib/booking.ts` does three things:
affiliate deep-links, **inbound** iCal (`BOOKING_ICAL_URLS` → `BlockedDate`, Booking is
source of truth and the sync replaces the whole snapshot), and **outbound** iCal
(`GET /api/ical`) so Booking won't resell a directly-booked date.
`POST /api/cron/sync` is authorized by `CRON_SECRET` **or** an admin session.

### Availability — one source of truth

Occupancy has two independent sources, both in `BlockedDate`, distinguished by `source`:
`booking.com` (replaced wholesale by `/api/cron/sync`) and `direct` (our own confirmed
bookings). **Always go through `src/lib/availability.ts`** — `isAvailable()` / `findConflicts()`
read both. Checking only one source is how the same week gets sold twice.

Confirming an inquiry (`confirmInquiry()`) writes the `direct` rows and flips the status in a
single transaction, and the `@@unique([roomSlug, date, source])` constraint is what makes
concurrent confirmation safe — a check-then-insert alone loses the race. Cancelling
(`releaseInquiry()`) deletes only `direct` rows; Booking.com's occupancy isn't ours to touch.

### Auth

Split deliberately: `src/auth.config.ts` is edge-safe (no Prisma, no bcrypt) for middleware;
`src/auth.ts` adds the Prisma adapter and the bcrypt `staff` credentials provider.
Sessions are JWT. Admin is guarded twice — middleware first, then `requireAdmin()` in the
server component. Staff login compares a dummy hash for unknown emails so response time
doesn't leak which accounts exist.

Google is registered **only when `AUTH_GOOGLE_ID` and `AUTH_GOOGLE_SECRET` are both set**
(`isGoogleConfigured`); otherwise the provider is omitted and the login page hides the
button, because an empty `client_id` produces a Google 400 error page.

### NFC access & scooter rentals

Physical-world layer for room doors and scooter docks. Data model in `prisma/schema.prisma`:
`Stay` → `StayGuest` → `Credential`, plus `AccessPoint`, `Scooter`, `RentalSession`,
`FolioItem`, `AccessEvent`, `UsedNonce`.

`Stay` is the folio anchor and represents a real in-house guest — distinct from `Inquiry`,
which is only a lead.

Request path for every reader call:

1. `authenticateReader()` (`src/lib/reader-request.ts`) — verifies the device signature and
   consumes the nonce. **Use this; never re-implement it per route.**
2. Credential proof — `verifyPhoneProof` / `verifyCardProof` (`src/lib/credential.ts`).
3. `decideAccess()` (`src/lib/access.ts`) — pure, DB-free decision rules.
4. `AccessEvent` written for every outcome, allowed or denied.

Two security invariants that the design depends on:

- **A card UID is not a secret.** Authorization is always challenge–response. For `CARD`,
  trust is carried by the *reader* (which holds the DESFire key), not the plastic; for
  `PHONE`, by an Ed25519 signature over a fresh challenge.
- **Devices sign with Ed25519, not HMAC.** The server stores only `AccessPoint.devicePublicKey`,
  so a database dump contains nothing that can open a door. Requests carry
  `X-Device-Id`/`X-Timestamp`/`X-Nonce`/`X-Signature` over `timestamp.nonce.body`; the body
  is read as raw text because the signature covers exact bytes.

Replay protection is the `UsedNonce` unique-key insert, and clock skew is ±60 s. Both
rejections are logged. Decisions fail closed.

`src/lib/access.ts` is pure by design so it can be unit-tested without a database — keep
new rules there rather than inside routes.

### Money

Stored in **halíře** (`amountCents`, `baseFeeCents`, `perMinuteCents`) — never floats.
`formatCents()` in `src/lib/access-admin.ts` divides by 100 and delegates to the existing
`formatPrice()` in `src/lib/i18n.ts`.

## Testing

Vitest, Node environment, `src/**/*.test.ts` only — the config deliberately covers pure
logic (`src/lib`), not routes. Routes are exercised against a running dev server with
the reader simulator:

```bash
npx tsx scripts/simulate-reader.ts door-gold card
npx tsx scripts/simulate-reader.ts door-silver card          # expect wrong_room
npx tsx scripts/simulate-reader.ts door-gold card --replay   # expect 409
npx tsx scripts/simulate-reader.ts door-gold card --skew 300 # expect clock_skew
npx tsx scripts/simulate-reader.ts dock-garage phone --rent SC-01
npx tsx scripts/simulate-reader.ts dock-garage phone --end <sessionId> --battery 72
```

It reads keys from `scripts/.devices.json`, written by the demo seed and gitignored.
Override the target with `SIMULATE_BASE_URL` if the dev server took a different port.

CI runs `typecheck` → `test` → `build`, then a second job boots the built server and runs
`scripts/ci-reader-check.ts` (11 assertions, exits non-zero on failure). See
`.github/workflows/ci.yml`. Both the manual simulator and the CI check share
`scripts/reader-client.ts`, so they sign requests identically.

## Known constraints

- **Postgres everywhere, including dev.** Readers write concurrently (`AccessEvent`,
  `UsedNonce`) and SQLite would lock. There is no SQLite fallback — `npm run dev`, the seed,
  and every script need a reachable Postgres. `assertProductionUrl()` in `src/lib/prisma.ts`
  additionally requires `?sslmode=` in production.
- `next.config.ts` sets `serverExternalPackages: ["pg", "@prisma/adapter-pg"]`. Removing it
  breaks every Prisma-backed route — `pg` opens TCP sockets and must not be bundled.
- The rate limiter in `src/app/api/inquiries/route.ts` is a per-instance in-memory `Map`.
  Do not reuse that pattern on `/api/access/*`; across instances it becomes a guest-lockout
  vector rather than a limit.
- The generated Prisma client lives at `src/generated/prisma` (gitignored) — run
  `npx prisma generate` after schema edits.
- `AccessEvent` records people's movement through a building. It is personal data under
  GDPR, so `src/lib/retention.ts` + `POST /api/cron/retention` delete it after
  `ACCESS_EVENT_RETENTION_DAYS` (default 90). The job only runs if something calls it —
  on Vercel that's the `crons` entry in `citadela-app/vercel.json`.

## Deployment

Production is `https://citadela-resort.cz` — Vercel (root directory `citadela-app`),
Neon Postgres, domain and DNS at Wedos with Wedos' own nameservers. The full runbook,
including the DNS records and the production env vars, is `citadela-app/NASAZENI.md`.

Vercel runs `vercel-build`, not `build` — it adds `prisma migrate deploy`, so schema
changes must ship as a migration in `prisma/migrations/`, never as a bare `db push`.
