# TODO — Citadela Resort

Prioritized backlog produced from a codebase review (2026-08-15). Grouped by area,
dependency-ordered within each. See `CLAUDE.md` for architecture and `TESTING.md`
for the browser regression procedure.

**Status of the tree today:** `npm run typecheck` clean, **85 unit tests** pass, `npm run build`
succeeds without a `.env`, site renders in cs/en, and CI runs everything on every push
(`.github/workflows/ci.yml`). Items marked ✅ landed on 2026-08-15; the rest is not yet built.

---

## Fixed on 2026-08-15

- **A second live double-booking path.** `/api/inquiries` checked only Booking.com occupancy,
  never our own confirmed direct bookings — so once staff confirmed a stay, the same dates
  could still be sold again through the form. Nothing stopped it except Booking.com eventually
  round-tripping our outbound iCal back to us, hours later, and only if sync is configured.
  Fixed by `src/lib/availability.ts`: confirmed bookings occupy `BlockedDate` with
  `source: "direct"`, and the unique key `(roomSlug, date, source)` makes concurrent
  confirmation safe. Verified with `scripts/check-double-booking.mts` (9 checks, incl. the race).

- **Booking.com occupancy was off by one day in any timezone east of UTC — including
  Czechia.** `node-ical` returns `VALUE=DATE` as *local* midnight, but `expandDates` read it
  with UTC getters, so `2026-08-10` became `2026-08-09`. The arrival day was blocked
  needlessly and **the final night was left free**, so the inquiry form would accept a date
  range that collides with a real reservation. Fixed with `calendarDayToUtc()` at the
  boundary in `fetchBlocks()`. It only worked on a UTC server, which is why nobody saw it.
  Found by the round-trip test, not by inspection.
- **The demo seed could not be re-run once a scooter had been rented.**
  `RentalSession.stayGuestId` is `onDelete: Restrict`, so `stay.deleteMany` hit a foreign
  key. The seed now dismantles rentals → folio → stay in order. This would have broken CI
  on its second run.
- **`.claude/settings.local.json` allowlisted `Bash(npx prisma *)`**, which covers
  `db push --force-reset` and `migrate reset` — both wipe the database without a prompt.
  Narrowed to specific safe subcommands.
- **`--skip-generate` was removed in Prisma 7**; the first draft of the CI workflow used it
  and would have failed on the runner.
- **`src/lib/i18n.ts` imports `server-only`**, which doesn't resolve under Vitest. Aliased
  to a stub so the module is testable.
- README's "12 Booking.com tests" claim is now true — there are 34.

---

## Legend

| Mark | Meaning |
|---|---|
| 🔴 | Blocker for going live |
| 🟡 | Needed before real guests use it |
| 🟢 | Improvement / nice to have |
| ⛔ | Blocked on something external (money, hardware, an account upgrade) |

---

## A. Stay lifecycle, folio & admin operations

The access system is read-only today: `/[locale]/admin/access` displays state, but nothing
in the app can *create* a stay, check a guest in, issue a card, or settle a bill. This is the
biggest functional gap. **No schema changes are required** — every field already exists.

Use **route handlers, not Server Actions**: every existing mutation in this codebase is a
`fetch()` to a route handler (`SyncPanel` → `/api/cron/sync`, the reader routes,
`/api/inquiries`). Keep one API surface. Auth.js's session cookie is `SameSite=Lax`, so it
is not sent on cross-site POST; every handler still starts with `requireAdmin()` and never
exposes a state-changing GET.

1. 🔴 **`src/lib/stay-admin.ts`** — mirror `access-admin.ts`. `generateStayReference()`
   (`CIT-${year}-${randomBytes(3).hex}`, retry on P2002), `loadStayDetail(stayId)` reused by
   both the detail page and the folio route. Reuse `formatCents`/`stayTone` — don't duplicate.
2. 🔴 **`POST /api/admin/stays`** — convert `Inquiry` → `Stay`. Reject if `inquiry.stay`
   already exists (`Stay.inquiryId` is unique — check first for a clean 409 instead of a
   Prisma error). One `$transaction`: create the `Stay` + primary `StayGuest`, set
   `Inquiry.status = CONFIRMED`.
3. 🔴 **`POST /api/admin/stay-guests`** — assign guests to rooms. Validate the slug with
   `asBedroomSlug()` from `src/lib/access.ts` (already exported). Reject a double-booked
   `bedroomSlug` within the same stay.
4. 🔴 **`POST /api/admin/stays/[stayId]/status`** — `BOOKED→CHECKED_IN→CHECKED_OUT`, plus
   `CANCELLED`. **On checkout or cancellation, revoke all active credentials in the same
   transaction** — checkout must not leave working doors behind.
   *Verify:* `npx tsx scripts/simulate-reader.ts door-gold card` → `credential_revoked`.
5. 🔴 **`POST`/`DELETE /api/admin/credentials`** — issue/revoke. `publicId` from
   `generateCredentialPublicId()`. Default validity to the stay's dates. **Revoke is soft**
   (`status = REVOKED`, `revokedAt`) — never hard-delete; `AccessEvent.credentialId` is
   `onDelete: SetNull` and the audit history must survive.
   Add an exported `isValidPhonePublicKey()` to `credential.ts` (reusing the existing SPKI
   parse) so malformed keys are rejected before they are persisted.
6. 🟡 **`GET /api/admin/folio/[stayId]` + `POST /api/admin/folio`** — settlement view and
   manual `FolioItem` (`kind: MANUAL`) for extras. Amounts entered in Kč, converted with
   `Math.round(kc * 100)` at the boundary — **never let a float past that point**.
7. 🟡 **Admin UI**: `src/app/[locale]/admin/stays/page.tsx` + `[stayId]/page.tsx`, same shell
   and classes as `admin/access/page.tsx`. Add a "convert to stay" control on the inquiry rows.
8. 🟡 **Email** — there is an explicit `TODO` at `src/app/api/inquiries/route.ts`.
   Recommended: **Resend** (Next-native SDK, no template engine, matches this project's
   minimal-dependency style). New `src/lib/mail.ts` with `sendMail()` wrapped so a provider
   outage logs and returns rather than throwing — mail must never block an inquiry or checkout.
   Add `RESEND_API_KEY`, `MAIL_FROM` to `.env.example`.
9. 🔴 **Dictionary keys** for all of the above, in **both** `en.ts` and `cs.ts`. Do this
   incrementally as each piece lands. `Dictionary = typeof en` is load-bearing: a missing
   Czech key fails `npm run typecheck`.

> **Follow-on, not blocking:** real `PHONE` credential issuance requires the guest's device to
> generate the keypair out-of-band. The admin route only *records* a public key the device
> already produced. See area B.

---

## B. NFC access completion & hardware

1. ✅ **Retention job** — *done.* `src/app/api/cron/retention/route.ts`, copying the auth pattern from
   `cron/sync/route.ts` (`CRON_SECRET` **or** `requireAdmin()`). Prunes expired `UsedNonce`
   (rows accumulate forever today) and `AccessEvent` older than `ACCESS_EVENT_RETENTION_DAYS`
   (default 90). Both indexes already exist. **`AccessEvent` is GDPR-relevant movement data —
   this is a legal requirement, not housekeeping.**
2. 🟡 **`POST /api/access/heartbeat`** — reuse `authenticateReader()` as-is (no credential
   involved). Needs `AccessPoint.batteryPct Int?` and `firmwareVersion String?`. Surface
   "silent reader" warnings in `loadAccessOverview()` next to the existing `deniedToday` stat.
   *Verify:* add a `--heartbeat` flag to the simulator.
3. 🟡 **Device provisioning + key rotation.** Add `AccessPoint.pendingDevicePublicKey` and
   `pendingSince`. `authenticateReader()` tries the active key, falls back to the pending one,
   and promotes it on first success — so a device cannot be bricked mid-reflash. Admin routes
   return the private key **once** and never persist it (same as `seedAccessDemo()`).
   Plus `scripts/provision-device.ts` for field installers.
4. 🟡 **Offline door credential (fail-soft, ≤4 h).** Note the trust direction *inverts* here:
   the door must verify without calling the server, so this needs a **server-held Ed25519
   signing key** (`OFFLINE_SIGNING_PRIVATE_KEY`, KMS in production) whose public half is baked
   into door firmware at provisioning. New `src/lib/offline-credential.ts`, pure, mirroring
   `device-auth.ts`. The ≤4 h expiry is enforced inside `issueOfflineCredential()`, not left to
   callers, and is the **entire** blast radius of a revocation that can't reach the lock —
   that is an accepted risk, documented, not a bug.
   **Scooter docks get nothing** — `decideScooterDock` needs live availability and open-rental
   state that cannot be cached safely. Fail closed there, as decided.
5. 🟢 **Android HCE app** (`citadela-key/`, separate project). `POST /api/credentials/enroll`
   on the web side, session-authenticated. `HostApduService` on a **proprietary AID — never a
   payment AID**; Ed25519 keypair in Android Keystore/StrongBox. `signAsPhone()` /
   `verifyPhoneProof()` in this repo are the reference implementation for the Kotlin side.
   iOS cannot do general HCE — iPhone guests get a physical card. Do not promise otherwise.
6. ⛔ **Lock hardware — decide before buying.** Two incompatible routes:
   - **Vendor** (SALTO XS4/KS, Assa Abloy Vingcard, dormakaba): the lock speaks the vendor's
     cloud API, *not* this repo's Ed25519 protocol, so integration means a
     `src/lib/lock-vendor/<vendor>.ts` adapter and the door stops using `device-auth.ts`.
     SALTO KS has a REST API and no partner agreement; Vingcard/dormakaba typically require one.
   - **DIY** (ESP32-S3 + PN532 + electric strike): keeps the existing protocol end to end and
     is exactly what `simulate-reader.ts` already emulates. **The NFC reader must expose raw
     APDU exchange, not UID-only** — a UID-only "RFID module" cannot do DESFire
     challenge-response and would silently reduce security to a clonable number.
7. ⛔ **DESFire key custody** — an HSM/KMS (YubiHSM2 or cloud KMS) for the master key
   diversification that `credential.ts` currently only assumes. Unimplemented anywhere today.

---

## C. Design system & Figma

**Figma MCP is authorized** (verified: handle `spare`, `dallheimal@gmail.com`). The blocker is
different from what was assumed: the seat is **View on a starter tier**, which *cannot create
or edit files*. `create_new_file` will fail.

1. ⛔ **Upgrade the Figma seat to Editor**, or nominate an existing file with edit access.
   Blocks items 3–4. Verify with `get_libraries` before attempting any write.
2. 🟢 **Token mirror, not a build pipeline.** There is no PostCSS/Tailwind/CSS tooling in this
   project at all. Adding a generator for ~30 custom properties costs more than it saves.
   Hand-maintain `citadela-app/tokens/tokens.json` (W3C Design Tokens format) as a documented
   mirror of the `:root` block in `globals.css`, with a cross-reference comment in both files.
   Add a snapshot test only if drift actually happens.
3. 🟢 ⛔ **Publish the design system into Figma (code → design).** The code is the mature
   artifact here, so the direction is code→design, not the reverse. Use the
   `figma-generate-library` skill to build variable collections from the tokens, then component
   frames matching the styleguide page.
4. 🟢 ⛔ **Code Connect mappings** for `.btn`/`.btn-solid`, `.pill[data-tone]`, `.panel`,
   `.room`, `.rate`. Needs real node IDs from item 3.
5. 🟢 **Styleguide page** — `src/app/[locale]/styleguide/page.tsx`, `robots: noindex` (pattern
   already in `admin/page.tsx`), plus `if (process.env.NODE_ENV === "production") notFound()`.
   Renders every component state and a token swatch grid. Doubles as the visual-regression
   surface for area D. **Not blocked on Figma — do this one first.**
6. 🟡 **Accessibility audit of the new tokens.** The status colors (`--ok #9fd3a8`,
   `--warn #e0bd7a`, `--bad #d99b8f`) were added recently and have **not** been contrast-checked
   against `--surface-1`/`--surface-2`. Also verify `:focus-visible` covers `.icon-btn`,
   `.pw-toggle` and dialog controls; check `.subnav`/`.rooms` at 375 px.

> The brand palette (`--black`, `--gold`, `--gold-hi`, `--gold-lo`, `--cream`) matches
> `citadela-brand-guidelines.html` and is authoritative. **Do not change it.** The reference
> designs in `~/Downloads` are a different hotel's identity — borrow structure, never colour.

---

## D. Testing & QA

Full procedure in **`TESTING.md`**. Backlog:

1. ✅ **`src/lib/booking.test.ts`** — *done, 34 tests.* Writing them uncovered a real
   timezone bug (see "Fixed" below). Critically: `expandDates` must **exclude the departure day**
   (a bug here double-books the villa), `buildIcal` round-trip parsed back with `node-ical`
   (already a dependency), `fold()` wrapping past 75 octets, `bookingUrl` affiliate/locale
   params, `icalTargets` parsing of both `url` and `slug=url` forms.
   README drift corrected — the claim now matches reality.
2. ✅ `src/lib/i18n.test.ts` — *done.* Assertions normalise Intl whitespace so they don't
   break on an ICU upgrade.
3. 🟡 `src/lib/access-admin.test.ts` — `formatCents` halíře→currency delegation.
4. ✅ **QA fixtures** — *done.* extend `prisma/seed.ts` with a `BlockedDate` at a fixed near-future
   date so the 409 "unavailable" path is deterministic instead of depending on live
   Booking.com data.
5. ✅ **CI** — *done.* Two jobs: `verify` (typecheck/test/build) and `reader-regression`
   (boots the built server, runs `scripts/ci-reader-check.ts`). Only the browser checklist
   still needs a human or an interactive Claude session.

**Keep the existing split**: pure logic → Vitest; routes → real dev server + simulator. The
reader routes read the *raw request body* for signature verification and use a native SQLite
module; a mocked harness would re-implement Next's request plumbing for little gain.

---

## E. Developer tooling (MCP, skills, hooks)

1. ✅ **Permission allowlist fixed.** *done.* `.claude/settings.local.json` currently allows
   `Bash(npx prisma *)`, which covers `npx prisma db push --force-reset` and
   `npx prisma migrate reset` — **both destroy the dev database**. Narrow it to specific
   subcommands and add the safe high-frequency commands:

   ```json
   {
     "permissions": {
       "allow": [
         "Bash(npm run typecheck)",
         "Bash(npm test)",
         "Bash(npx vitest run *)",
         "Bash(npx prisma validate)",
         "Bash(npx prisma generate)",
         "Bash(npx tsx scripts/simulate-reader.ts *)",
         "Bash(curl http://localhost:3000/*)",
         "Bash(git status)",
         "Bash(git diff *)",
         "Bash(git log *)"
       ]
     }
   }
   ```
   Deliberately **not** allowlisted: `db:push`, `db:seed`, `npm run build`, any
   `git add`/`commit`/`push`, anything with `rm`.
   Then run the `fewer-permission-prompts` skill against real transcripts to catch what this
   list misses, rather than guessing further.

2. 🟡 **Three project skills** in `citadela-app/.claude/skills/`. Each is a *procedure with a
   runnable verification step*, which is why it beats a paragraph in `CLAUDE.md`:
   - **`nfc-reader-endpoint`** — highest risk. Mandates `authenticateReader()` as the first
     line; forbids re-deriving signature/nonce/skew logic; requires reading the body as raw
     text before parsing; requires an `AccessEvent` on every branch; requires the negative
     simulator runs (`--replay` → 409, `--skew 300`, wrong room) to pass.
   - **`bilingual-page`** — en first, mirror in cs, never pass whole `dict` to a Client
     Component, `npm run typecheck` as the gate.
   - **`reader-simulator-regression`** — the exact simulator sequence with expected output
     per line.
   *Not worth building:* a Prisma-model-to-admin-row skill (too broad, pattern hasn't repeated
   enough yet), and a browser-verification skill (the built-in `run` skill already covers it).

3. 🟡 **Typecheck hook** — a `PostToolUse` hook on `Edit`/`Write` for `*.ts`/`*.tsx` running
   `npm run typecheck`. This must be a **hook, not a skill**: hooks fire deterministically via
   the harness, skills only when invoked. Author it with the `update-config` skill rather than
   hand-writing matcher JSON. Put it in `.claude/settings.json` (shared), not `.local.json`.

4. **MCP servers — honest assessment.** Most connected servers need OAuth that is not
   authorized, and cannot be authorized non-interactively (use claude.ai connector settings, or
   `claude mcp` / `/mcp` in an interactive terminal).
   - **Already usable:** the in-app Chrome browser (`mcp__Claude_Browser__*`) — covers the
     "verify in the browser" need with no setup. Figma — authorized but seat-limited (see C).
   - **Worth adding now:** a **SQLite MCP** pointed at `citadela-app/prisma/dev.db`, to inspect
     seeded rows, `AccessEvent`, and `UsedNonce` without writing throwaway scripts. Not in this
     session's roster — must be added via `claude mcp add`.
   - **Worth it after auth:** **GitHub** (remote confirmed: `sparesparrow/citadela`) for PRs
     and issues.
   - **Worth it only after deploy:** Sentry (no production yet), Postgres MCP (only relevant
     after the SQLite→Postgres cutover).
   - **Not recommended:** ElevenLabs, Zapier, Gmail, Drive, Atlassian — no tie to this
     codebase's workflow. Don't wire a server just because it exists.

5. **A second `citadela-app/CLAUDE.md` is not warranted** — the root file already scopes all
   commands to that directory and covers its architecture in full. A single-app repo with no
   sibling packages doesn't need a forked source of truth.

---

## F. Production readiness (from `citadela-app/README.md`, still open)

1. ✅ **Postgres cutover** — *done.* Postgres in dev too; there is no SQLite fallback left.
   Running locally now requires a Postgres server (none is installed on this machine).
2. 🔴 **Secrets** — `AUTH_SECRET` in `.env` is a development placeholder; generate a real one
   (`openssl rand -base64 32`). `ADMIN_PASSWORD` is `dev-heslo-zmente-me`; change it and re-seed.
3. 🔴 **Shared rate limiter** — the in-memory `Map` in `api/inquiries/route.ts` is per-instance.
   Move to Redis/Upstash before running more than one instance, and **never** reuse that pattern
   on `/api/access/*`, where it becomes a guest-lockout vector.
4. 🟡 **GDPR pages** — privacy policy and terms, in both languages. Required before launch, and
   the access-audit retention policy (B1) must be described there.
5. 🟡 **Rental T&C** — `RENTAL_TERMS_VERSION` is recorded per `RentalSession`, but the actual
   terms document does not exist. Also needed: insurance, minimum age, helmet policy.
6. 🟢 Replace `sampleReviews` with real Booking.com reviews and flip `reviewsArePublishable`;
   verify `bookingScore`.
7. 🟢 Resolve the source-text contradictions listed in `citadela-app/README.md` (capacity 35 vs
   40, week = 6 vs 7 nights) and reconcile `site.ts`.
