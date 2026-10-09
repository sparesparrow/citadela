import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { signInAction } from "@/app/admin/actions";
import { getDictionary } from "@/lib/i18n";

export const metadata: Metadata = { title: "Anmeldung", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; callbackUrl?: string }>;
}) {
  const { error, callbackUrl } = await searchParams;
  if ((await auth())?.user?.role === "ADMIN") redirect("/admin");
  const dict = await getDictionary();
  const l = dict.admin.login;

  return (
    <main className="login-box" id="main">
      <h1>{l.title}</h1>
      {error && <div className="notice notice-error" role="alert">{l.error}</div>}
      <form action={signInAction}>
        <input type="hidden" name="callbackUrl" value={callbackUrl ?? "/admin"} />
        <div className="field">
          <label htmlFor="email">{l.email}</label>
          <input id="email" name="email" type="email" autoComplete="username" required />
        </div>
        <div className="field">
          <label htmlFor="password">{l.password}</label>
          <input id="password" name="password" type="password" autoComplete="current-password" required minLength={8} />
        </div>
        <button className="btn" type="submit" style={{ width: "100%" }}>{l.submit}</button>
      </form>
    </main>
  );
}
