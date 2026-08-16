import Link from "next/link";
import { notFound } from "next/navigation";
import { getDictionary, isLocale, formatPrice, type Locale } from "@/lib/i18n";
import {
  site,
  rentalItems,
  rentalTerms,
  rentalTermsArePublishable,
} from "@/lib/site";

/**
 * Podmínky půjčovny. Sazby, kauce, průkazy a věk se berou ze site.ts —
 * ceník a podmínky se tak nemůžou rozejít. Dokud není sjednané pojištění
 * (rentalTermsArePublishable), stránka se hlásí jako pracovní verze
 * a vyhledávače ji nemají indexovat.
 */
export const metadata = {
  robots: { index: false, follow: false },
};

export default async function RentalTermsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: raw } = await params;
  if (!isLocale(raw)) notFound();
  const locale = raw as Locale;

  const dict = await getDictionary(locale);
  const t = dict.rentalTerms;
  const money = (n: number) => formatPrice(n, locale);

  return (
    <main className="admin-shell" id="main">
      <div className="admin-head">
        <div>
          <h1>{t.title}</h1>
          <p className="admin-who">{t.versionLabel(rentalTerms.version)}</p>
        </div>
        <Link className="dialog-close" href={`/${locale}`}>
          ← {t.back}
        </Link>
      </div>

      {!rentalTermsArePublishable && (
        <div className="panel" style={{ marginTop: 30 }}>
          <div className="panel-head">
            <h2>{t.draftHeading}</h2>
            <span className="pill" data-tone="warn">
              {t.versionLabel(rentalTerms.version)}
            </span>
          </div>
          <div className="panel-body">
            <p>{t.draftBody}</p>
          </div>
        </div>
      )}

      <p className="lead" style={{ marginTop: 36 }}>
        {t.lead}
      </p>

      <h2 className="terms-heading" style={{ marginTop: 46 }}>
        {t.requirementsHeading}
      </h2>
      <div className="table-wrap fleet-table">
        <table>
          <caption className="visually-hidden">{t.requirementsHeading}</caption>
          <thead>
            <tr>
              <th scope="col">{t.columns.item}</th>
              <th scope="col">{t.columns.licence}</th>
              <th scope="col">{t.columns.age}</th>
              <th scope="col">{t.columns.deposit}</th>
            </tr>
          </thead>
          <tbody>
            {rentalItems.map((item) => (
              <tr key={item.slug}>
                <td>{dict.rentals.items[item.slug].name}</td>
                <td>
                  {item.licence ? dict.rentals.licences[item.licence] : dict.rentals.licences.none}
                </td>
                <td className="num">{item.minAge ? dict.rentals.minAge(item.minAge) : t.noAge}</td>
                <td className="num">{item.deposit ? money(item.deposit) : t.noDeposit}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h2 className="terms-heading" style={{ marginTop: 46 }}>
        {t.clausesHeading}
      </h2>
      <ul className="terms" style={{ maxWidth: "72ch" }}>
        <li>{t.clauses.handover(rentalTerms.handoverFrom, rentalTerms.returnBy)}</li>
        <li>{t.clauses.late(money(rentalTerms.lateFeePerHour))}</li>
        <li>{t.clauses.licence}</li>
        <li>{t.clauses.minors}</li>
        <li>{t.clauses.boat}</li>
        {rentalTerms.helmetRequired && <li>{t.clauses.helmet}</li>}
        <li>{t.clauses.alcohol}</li>
        <li>{t.clauses.fuel}</li>
        <li>{t.clauses.area}</li>
        <li>{t.clauses.deposit}</li>
        <li>{t.clauses.damage}</li>
        {/* Spoluúčast se neuvádí, dokud pojištění neexistuje — číslo z hlavy
            by v podmínkách bylo horší než přiznaná mezera. */}
        <li>
          {rentalTerms.insuranceExcess === null
            ? t.clauses.insuranceMissing
            : t.clauses.insurance(money(rentalTerms.insuranceExcess))}
        </li>
        <li>{t.clauses.breakdown}</li>
      </ul>

      <h2 className="terms-heading" style={{ marginTop: 46 }}>
        {t.contactHeading}
      </h2>
      <p className="lead">{t.contactBody}</p>
      <p className="reserve-note">
        <a href={`mailto:${site.email}`}>{site.email}</a>
        <br />
        <a href={`tel:${site.phone}`}>{site.phoneDisplay}</a>
      </p>
    </main>
  );
}
