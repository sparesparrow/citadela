import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { requireAdmin } from "@/auth";
import { isLocale, formatDate, type Locale } from "@/lib/i18n";
import {
  formatCents,
  loadAccessOverview,
  scooterTone,
  stayTone,
} from "@/lib/access-admin";

export const metadata = { robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

/** Cas s minutami — v auditu potrebujeme presnost, ne jen datum. */
function formatTime(date: Date, locale: Locale): string {
  return new Intl.DateTimeFormat(locale === "cs" ? "cs-CZ" : "en-GB", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export default async function AccessAdminPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: raw } = await params;
  if (!isLocale(raw)) notFound();
  const locale = raw as Locale;

  // Stejna dvoustupnova ochrana jako na hlavni administraci.
  const session = await requireAdmin();
  if (!session) {
    redirect(`/${locale}/login?staff=1&callbackUrl=/${locale}/admin/access`);
  }

  const cs = locale === "cs";
  const {
    stays,
    scooters,
    accessPoints,
    events,
    openRentals,
    deniedToday,
    activeCredentials,
  } = await loadAccessOverview();

  const doors = accessPoints.filter((p) => p.kind === "DOOR");
  const docks = accessPoints.filter((p) => p.kind === "SCOOTER_DOCK");

  return (
    <main className="admin-shell" id="main">
      <div className="admin-head">
        <div>
          <h1>{cs ? "Přístupy a koloběžky" : "Access & scooters"}</h1>
          <p className="admin-who">
            {cs
              ? "Karty, telefony, dveře a výpůjčky v reálném čase."
              : "Cards, phones, doors and rentals in real time."}
          </p>
        </div>
        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          <Link className="dialog-close" href={`/${locale}/admin`}>
            ← {cs ? "Administrace" : "Admin"}
          </Link>
        </div>
      </div>

      <dl className="stat-grid">
        <div className="stat">
          <dt>{cs ? "Hosté v domě" : "Guests in house"}</dt>
          <dd>{stays.filter((s) => s.status === "CHECKED_IN").length}</dd>
        </div>
        <div className="stat">
          <dt>{cs ? "Aktivní prostředky" : "Active credentials"}</dt>
          <dd>{activeCredentials}</dd>
        </div>
        <div className="stat">
          <dt>{cs ? "Půjčené koloběžky" : "Scooters out"}</dt>
          <dd>{openRentals}</dd>
        </div>
        <div className="stat">
          <dt>{cs ? "Zamítnuto (24 h)" : "Denied (24 h)"}</dt>
          <dd className={deniedToday > 0 ? "data" : undefined}>{deniedToday}</dd>
        </div>
      </dl>

      {/* ---------------------------------------------------------------- */}
      <section className="panel">
        <div className="panel-head">
          <h2>{cs ? "Pobyty a prostředky" : "Stays & credentials"}</h2>
          <span className="pill" data-tone="mute">
            {stays.length} {cs ? "aktivních" : "active"}
          </span>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>{cs ? "Rezervace" : "Reference"}</th>
                <th>{cs ? "Termín" : "Dates"}</th>
                <th>{cs ? "Stav" : "Status"}</th>
                <th>{cs ? "Host / pokoj" : "Guest / room"}</th>
                <th>{cs ? "Prostředek" : "Credential"}</th>
                <th className="num">{cs ? "Útrata" : "Folio"}</th>
              </tr>
            </thead>
            <tbody>
              {stays.length === 0 && (
                <tr>
                  <td colSpan={6}>{cs ? "Žádné aktivní pobyty." : "No active stays."}</td>
                </tr>
              )}
              {stays.map((stay) => {
                const total = stay.folioItems.reduce((sum, f) => sum + f.amountCents, 0);
                return (
                  <tr key={stay.id}>
                    <td className="mono">{stay.reference}</td>
                    <td>
                      {formatDate(stay.arrival, locale)} → {formatDate(stay.departure, locale)}
                    </td>
                    <td>
                      <span className="pill" data-tone={stayTone(stay.status)}>
                        {stay.status}
                      </span>
                    </td>
                    <td>
                      {stay.stayGuests.map((g) => (
                        <div key={g.id}>
                          {g.name}
                          {g.bedroomSlug ? ` · ${g.bedroomSlug}` : ""}
                        </div>
                      ))}
                    </td>
                    <td>
                      {stay.stayGuests.flatMap((g) =>
                        g.credentials.map((c) => (
                          <div key={c.id}>
                            <span
                              className="pill"
                              data-tone={c.status === "ACTIVE" ? "ok" : "bad"}
                            >
                              {c.type}
                            </span>
                          </div>
                        )),
                      )}
                    </td>
                    <td className="num">{formatCents(total, locale)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {/* ---------------------------------------------------------------- */}
      <section className="panel">
        <div className="panel-head">
          <h2>{cs ? "Koloběžky" : "Scooters"}</h2>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>{cs ? "Kód" : "Code"}</th>
                <th>{cs ? "Stav" : "Status"}</th>
                <th className="num">{cs ? "Baterie" : "Battery"}</th>
                <th className="num">{cs ? "Nástupní" : "Base fee"}</th>
                <th className="num">{cs ? "Za minutu" : "Per minute"}</th>
              </tr>
            </thead>
            <tbody>
              {scooters.map((s) => (
                <tr key={s.id}>
                  <td className="mono">{s.code}</td>
                  <td>
                    <span className="pill" data-tone={scooterTone(s.status)}>
                      {s.status}
                    </span>
                  </td>
                  <td className="num">{s.batteryPct} %</td>
                  <td className="num">{formatCents(s.baseFeeCents, locale)}</td>
                  <td className="num">{formatCents(s.perMinuteCents, locale)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* ---------------------------------------------------------------- */}
      <section className="panel">
        <div className="panel-head">
          <h2>{cs ? "Čtečky" : "Readers"}</h2>
          <span className="pill" data-tone="mute">
            {doors.length} {cs ? "dveří" : "doors"} · {docks.length}{" "}
            {cs ? "stojanů" : "docks"}
          </span>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>{cs ? "Zařízení" : "Device"}</th>
                <th>{cs ? "Umístění" : "Location"}</th>
                <th>{cs ? "Typ" : "Kind"}</th>
                <th>{cs ? "Stav" : "State"}</th>
              </tr>
            </thead>
            <tbody>
              {accessPoints.map((p) => (
                <tr key={p.id}>
                  <td className="mono">{p.id}</td>
                  <td>{p.label}</td>
                  <td>
                    <span className="pill" data-tone="mute">
                      {p.isCommon ? (cs ? "Společné" : "Common") : p.kind}
                    </span>
                  </td>
                  <td>
                    <span className="pill" data-tone={p.enabled ? "ok" : "bad"}>
                      {p.enabled ? (cs ? "Aktivní" : "Enabled") : cs ? "Vypnuto" : "Disabled"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* ---------------------------------------------------------------- */}
      <section className="panel">
        <div className="panel-head">
          <h2>{cs ? "Audit přístupů" : "Access audit"}</h2>
          <span className="pill" data-tone={deniedToday > 0 ? "warn" : "mute"}>
            {cs ? "posledních" : "last"} {events.length}
          </span>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>{cs ? "Čas" : "Time"}</th>
                <th>{cs ? "Čtečka" : "Reader"}</th>
                <th>{cs ? "Host" : "Guest"}</th>
                <th>{cs ? "Výsledek" : "Result"}</th>
                <th>{cs ? "Důvod" : "Reason"}</th>
              </tr>
            </thead>
            <tbody>
              {events.length === 0 && (
                <tr>
                  <td colSpan={5}>{cs ? "Zatím žádné záznamy." : "No events yet."}</td>
                </tr>
              )}
              {events.map((e) => (
                <tr key={e.id}>
                  <td className="mono">{formatTime(e.at, locale)}</td>
                  <td>{e.accessPoint.label}</td>
                  <td>{e.credential?.stayGuest.name ?? "—"}</td>
                  <td>
                    <span className="pill" data-tone={e.allowed ? "ok" : "bad"}>
                      {e.allowed ? (cs ? "Povoleno" : "Allowed") : cs ? "Zamítnuto" : "Denied"}
                    </span>
                  </td>
                  <td className="mono">{e.reason}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="panel-body">
          <p>
            {cs
              ? "Záznamy obsahují pohyb osob po objektu — osobní údaj. Uchovávejte je jen po nezbytnou dobu (doporučeno 90 dní)."
              : "These records track people's movement through the building — personal data. Retain only as long as necessary (90 days recommended)."}
          </p>
        </div>
      </section>
    </main>
  );
}
