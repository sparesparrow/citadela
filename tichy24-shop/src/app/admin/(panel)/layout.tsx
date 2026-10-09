import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/auth";
import { signOutAction } from "@/app/admin/actions";
import { getDictionary } from "@/lib/i18n";

export const metadata: Metadata = {
  title: { default: "Verwaltung", template: "%s | Verwaltung" },
  robots: { index: false, follow: false },
};
export const dynamic = "force-dynamic";

export default async function PanelLayout({ children }: { children: React.ReactNode }) {
  // Zweite, echte Schranke — die Middleware ist nur ein erster Filter.
  const session = await requireAdmin();
  if (!session) redirect("/admin/login");

  const dict = await getDictionary();
  const a = dict.admin;

  return (
    <>
      <header className="admin-bar">
        <div className="container header-inner">
          <Link href="/admin">{a.nav.orders}</Link>
          <Link href="/admin/produkte">{a.nav.products}</Link>
          <Link href="/">{a.nav.shop}</Link>
          <div className="who">
            <span>{a.welcome} {session.user.email}</span>
            <form action={signOutAction}>
              <button className="btn-link" type="submit">{a.signOut}</button>
            </form>
          </div>
        </div>
      </header>
      <main className="main" id="main">
        <div className="container">{children}</div>
      </main>
    </>
  );
}
