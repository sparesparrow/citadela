import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { requireAdmin } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getDictionary, isLocale, formatDate, type Locale } from "@/lib/i18n";
import { icalTargets } from "@/lib/booking";
import { isSegmentKey, type RentalKey } from "@/lib/site";
import type { Dictionary } from "@/dictionaries/en";
import { SyncPanel } from "@/components/SyncPanel";
import { SignOutButton } from "@/components/AuthForms";

export const metadata = { robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

function nightsBetween(a: Date, b: Date): number {
  return Math.max(1, Math.round((b.getTime() - a.getTime()) / 86_400_000));
}

/**
 * Segment i technika se v poptávce ukládají jako slug. Číselník žije v site.ts
 * a může se změnit dřív než staré záznamy, proto se neznámý slug jen vypíše,
 * ne aby kvůli němu spadl výpis poptávek.
 */
function segmentLabel(slug: string, dict: Dictionary): string {
  if (isSegmentKey(slug)) return dict.groups.items[slug].name;
  if (slug === "other") return dict.reserve.form.occasionOther;
  return dict.admin.inquiries.noSegment;
}

function rentalLabel(slug: string, dict: Dictionary): string {
  const items = dict.rentals.items as Record<string, { name: string } | undefined>;
  return items[slug]?.name ?? slug;
}

export default async function AdminPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: raw } = await params;
  if (!isLocale(raw)) notFound();
  const locale = raw as Locale;

  // Druhá, skutečná bariéra — middleware je jen první filtr.
  const session = await requireAdmin();
  if (!session) {
    redirect(`/${locale}/login?staff=1&callbackUrl=/${locale}/admin`);
  }

  const dict = await getDictionary(locale);

  const [newCount, totalCount, corporateCount, blockedCount, lastSync, inquiries] = await Promise.all([
    prisma.inquiry.count({ where: { status: "NEW" } }),
    prisma.inquiry.count(),
    prisma.inquiry.count({ where: { segment: "corporate" } }),
    prisma.blockedDate.count(),
    prisma.syncLog.findFirst({ where: { ok: true }, orderBy: { startedAt: "desc" } }),
    prisma.inquiry.findMany({ orderBy: { createdAt: "desc" }, take: 50 }),
  ]);

  const base = process.env.AUTH_URL ?? "http://localhost:3000";

  return (
    <main className="admin-shell" id="main">
      <div className="admin-head">
        <div>
          <h1>{dict.admin.title}</h1>
          <p className="admin-who">
            {dict.admin.welcome} <strong>{session.user.email}</strong>
          </p>
        </div>
        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          <Link className="dialog-close" href={`/${locale}/admin/access`}>
            {locale === "cs" ? "Přístupy a koloběžky" : "Access & scooters"} →
          </Link>
          <Link className="dialog-close" href={`/${locale}`}>
            ← {dict.auth.back}
          </Link>
          <SignOutButton label={dict.nav.signOut} />
        </div>
      </div>

      <dl className="stat-grid">
        <div className="stat">
          <dt>{dict.admin.stats.newInquiries}</dt>
          <dd>{newCount}</dd>
        </div>
        <div className="stat">
          <dt>{dict.admin.stats.totalInquiries}</dt>
          <dd>{totalCount}</dd>
        </div>
        <div className="stat">
          <dt>{dict.admin.stats.corporateInquiries}</dt>
          <dd>{corporateCount}</dd>
        </div>
        <div className="stat">
          <dt>{dict.admin.stats.blockedDates}</dt>
          <dd>{blockedCount}</dd>
        </div>
        <div className="stat">
          <dt>{dict.admin.stats.lastSync}</dt>
          <dd className="small">
            {lastSync ? formatDate(lastSync.startedAt, locale) : dict.admin.stats.never}
          </dd>
        </div>
      </dl>

      <SyncPanel sync={dict.admin.sync} configured={icalTargets().length > 0} icalUrl={`${base}/api/ical`} />

      <section className="panel">
        <div className="panel-head">
          <h2>{dict.admin.tabs.inquiries}</h2>
        </div>
        {inquiries.length === 0 ? (
          <div className="panel-body">
            <p>{dict.admin.inquiries.empty}</p>
          </div>
        ) : (
          <div className="table-wrap">
            <table>
              <caption className="visually-hidden">{dict.admin.tabs.inquiries}</caption>
              <thead>
                <tr>
                  <th scope="col">{dict.admin.inquiries.guest}</th>
                  <th scope="col">{dict.admin.inquiries.dates}</th>
                  <th scope="col">{dict.admin.inquiries.guests}</th>
                  <th scope="col">{dict.admin.inquiries.occasion}</th>
                  <th scope="col">{dict.admin.inquiries.received}</th>
                  <th scope="col">{dict.admin.inquiries.status}</th>
                </tr>
              </thead>
              <tbody>
                {inquiries.map((inq) => (
                  <tr key={inq.id}>
                    <td>
                      <strong style={{ color: "var(--cream)" }}>{inq.name}</strong>
                      <br />
                      <a href={`mailto:${inq.email}`} style={{ color: "var(--gold-hi)" }}>
                        {inq.email}
                      </a>
                      {inq.phone && <br />}
                      {inq.phone}
                    </td>
                    <td>
                      {formatDate(inq.arrival, locale)} → {formatDate(inq.departure, locale)}
                      <br />
                      <span style={{ color: "var(--gold-lo)" }}>
                        {dict.admin.inquiries.nights(nightsBetween(inq.arrival, inq.departure))}
                      </span>
                    </td>
                    <td>{inq.guests}</td>
                    <td>
                      {segmentLabel(inq.segment, dict)}
                      {inq.companyName && (
                        <>
                          <br />
                          <strong style={{ color: "var(--cream)" }}>{inq.companyName}</strong>
                        </>
                      )}
                      {inq.companyId && (
                        <>
                          <br />
                          <span className="small">
                            {dict.admin.inquiries.companyId} {inq.companyId}
                            {inq.vatId ? ` · ${dict.admin.inquiries.vatId} ${inq.vatId}` : ""}
                          </span>
                        </>
                      )}
                      {inq.rentalInterest.length > 0 && (
                        <>
                          <br />
                          <span style={{ color: "var(--gold-lo)" }}>
                            {dict.admin.inquiries.wantsRentals}:{" "}
                            {inq.rentalInterest
                              .map((slug: RentalKey | string) => rentalLabel(slug, dict))
                              .join(", ")}
                          </span>
                        </>
                      )}
                    </td>
                    <td>{formatDate(inq.createdAt, locale)}</td>
                    <td>
                      <span className="pill" data-status={inq.status}>
                        {dict.admin.inquiries.statuses[inq.status]}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
}
