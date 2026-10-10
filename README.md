# Citadela Resort

Website, booking back end and brand identity for **[Citadela Resort](https://citadela-resort.cz)**: a
private villa with wellness above the Brno Reservoir (Rozdrojovice, South Moravia), rented as a whole
to a single party at a time. Built for the owner, a local accommodation business.

**Live:** [citadela-resort.cz](https://citadela-resort.cz) — in Czech ([/cs](https://citadela-resort.cz/cs))
and English ([/en](https://citadela-resort.cz/en)).

## What's in the repository

| Path | What it is |
|---|---|
| [`citadela-app/`](citadela-app) | The production web application — see its [README](citadela-app/README.md) (Czech) and the deployment runbook [`NASAZENI.md`](citadela-app/NASAZENI.md) |
| `citadela-brand-guidelines.html` | One-page brand book: logo suite, colour, typography, motifs, voice |
| `citadela-horizontal.png`, `citadela-stacked-transparent.png`, `preview-card-*.png`, `citadela-poster.png` | Logo lockups, business card and the art-deco poster |
| `citadela-website.html`, `citadela-nahled-cs.html`, `citadela-nahled-en.html` | The original single-file site design and its Czech/English previews |
| `citadela-web-copy.md` | Website copy |
| [`REVIZE-WEBU.md`](REVIZE-WEBU.md) | Review of the original single-file site and what the application fixes |
| [`TESTING.md`](TESTING.md) | How to verify the site: type check, unit tests, signed-reader checks, browser walkthrough |
| `photos/` | Property photography used on the site |

## The application

Next.js 15 (App Router) · TypeScript · Prisma 7 on PostgreSQL · Auth.js v5 · Vitest · deployed on
Vercel with Neon Postgres.

- **Bilingual site** (`/cs`, `/en`). Locale comes from a cookie or `Accept-Language`; the English
  dictionary types the Czech one, so a missing translation fails the type check.
- **Single-unit booking model.** The villa is rented whole, never per room, so there is one occupancy
  calendar. Inquiries are stored in the database and confirmed by staff.
- **Booking.com integration** without a public API: affiliate deep links, inbound iCal sync that
  blocks dates sold on Booking.com, and an outbound iCal feed so Booking.com never resells a date booked
  directly. Confirmation writes occupancy in one transaction, guarded by a unique constraint against
  double-selling.
- **Auth.** Google sign-in for guests (enabled only when configured) and a separate staff login with
  bcrypt and timing-safe handling of unknown accounts; the admin area is guarded in middleware and again
  on the server.
- **NFC door access and electric-scooter rental.** Readers sign every request with Ed25519 (the server
  stores only public keys), nonces block replays, clock skew is limited to ±60 s, and every decision,
  allowed or denied, is logged. Card UIDs are never treated as secrets: access is challenge–response.
  Money is stored in haléře, never floats.
- **GDPR.** Access events are personal data and are deleted after a retention period by a scheduled job.
- **Quality gates.** CI runs type check → unit tests → production build, then boots the built server
  and runs signed NFC-reader checks against it.

## Brand

*Gold light on dark water.* Matte black `#0A0A0A` and rich gold `#C9A84C` (with gold light `#E7CE84`,
gold deep `#9A7E32` and cream `#F3ECDD`); Italiana for the logotype, Playfair Display for headlines,
Jost for body text. The voice is a five-star concierge: confident, unhurried, never loud.
Open `citadela-brand-guidelines.html` to see the whole system on one page.
