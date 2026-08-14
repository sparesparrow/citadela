import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { isGoogleConfigured } from "@/auth.config";
import { getDictionary, isLocale, type Locale } from "@/lib/i18n";
import { BOOKING_TRIPS_URL } from "@/lib/booking";
import { GoogleSignIn, StaffSignIn, SignOutButton } from "@/components/AuthForms";

export const metadata = { robots: { index: false, follow: false } };

export default async function LoginPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ staff?: string; callbackUrl?: string }>;
}) {
  const { locale: raw } = await params;
  if (!isLocale(raw)) notFound();
  const locale = raw as Locale;

  const { staff, callbackUrl } = await searchParams;
  const dict = await getDictionary(locale);
  const session = await auth();

  // Přihlášený administrátor nemá na přihlašovací stránce co dělat.
  if (session?.user?.role === "ADMIN" && !staff) redirect(`/${locale}/admin`);

  // Otevřené přesměrování zabráníme tím, že přijmeme jen vlastní cesty.
  const safeCallback =
    callbackUrl && callbackUrl.startsWith("/") && !callbackUrl.startsWith("//")
      ? callbackUrl
      : `/${locale}`;

  const staffMode = staff === "1";

  return (
    <main className="auth-shell" id="main">
      <div className="auth-card">
        <h1>{staffMode ? dict.auth.adminTitle : dict.auth.signInTitle}</h1>
        <p className="auth-lead">{staffMode ? dict.auth.adminLead : dict.auth.signInLead}</p>

        {session?.user && (
          <div className="form-status" data-tone="ok" style={{ marginTop: 22 }}>
            {dict.reserve.form.signedInAs} <strong>{session.user.email}</strong>
            <div style={{ marginTop: 14 }}>
              <SignOutButton label={dict.nav.signOut} />
            </div>
          </div>
        )}

        {!staffMode && !session?.user && (
          <>
            {isGoogleConfigured && (
              <div style={{ marginTop: 30 }}>
                <GoogleSignIn auth={dict.auth} callbackUrl={safeCallback} />
              </div>
            )}

            <p className="auth-note">{dict.auth.bookingNote}</p>
            <a
              className="btn btn-block"
              href={BOOKING_TRIPS_URL}
              target="_blank"
              rel="noopener noreferrer"
              style={{ marginTop: 18 }}
            >
              <span>{dict.auth.openBooking}</span>
            </a>

            <div className="auth-divider">{dict.auth.or}</div>
            <Link className="auth-back" href={`/${locale}/login?staff=1`}>
              {dict.auth.adminTitle}
            </Link>
          </>
        )}

        {staffMode && (
          <div style={{ marginTop: 30 }}>
            <StaffSignIn auth={dict.auth} callbackUrl={safeCallback.includes("/admin") ? safeCallback : `/${locale}/admin`} />
          </div>
        )}

        <div>
          <Link className="auth-back" href={`/${locale}`}>
            ← {dict.auth.back}
          </Link>
        </div>
      </div>
    </main>
  );
}
