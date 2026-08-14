import NextAuth from "next-auth";
import type { Session } from "next-auth";
import { NextResponse, type NextRequest } from "next/server";
import { authConfig } from "@/auth.config";

/** Požadavek obohacený Auth.js o přihlášenou relaci. */
type AuthedRequest = NextRequest & { auth: Session | null };

const { auth } = NextAuth(authConfig);

const locales = ["cs", "en"] as const;
const defaultLocale = "cs";
const LOCALE_COOKIE = "citadela_locale";

function pickLocale(req: NextRequest): string {
  // 1. Uložená volba návštěvníka má přednost.
  const cookie = req.cookies.get(LOCALE_COOKIE)?.value;
  if (cookie && (locales as readonly string[]).includes(cookie)) return cookie;

  // 2. Jinak jazyk prohlížeče, s fallbackem na češtinu.
  const header = req.headers.get("accept-language");
  if (header) {
    const preferred = header
      .split(",")
      .map((part) => {
        const [tag, q] = part.trim().split(";q=");
        return { tag: tag.toLowerCase(), q: q ? Number(q) : 1 };
      })
      .sort((a, b) => b.q - a.q);

    for (const { tag } of preferred) {
      const base = tag.split("-")[0];
      if (base === "cs" || base === "sk") return "cs";
      if (base === "en") return "en";
    }
  }
  return defaultLocale;
}

export default auth((req: AuthedRequest) => {
  const { pathname } = req.nextUrl;

  const hasLocale = locales.some(
    (l) => pathname === `/${l}` || pathname.startsWith(`/${l}/`),
  );

  // Přesměrování na jazykovou variantu.
  if (!hasLocale) {
    const locale = pickLocale(req);
    const url = req.nextUrl.clone();
    url.pathname = `/${locale}${pathname === "/" ? "" : pathname}`;
    const res = NextResponse.redirect(url);
    res.cookies.set(LOCALE_COOKIE, locale, {
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
      sameSite: "lax",
    });
    return res;
  }

  const locale = pathname.split("/")[1];

  // Ochrana administrace. Skutečná autorizace se ověřuje ještě jednou
  // v serverovém layoutu — tohle je jen první, levná bariéra.
  if (pathname.includes("/admin")) {
    const role = req.auth?.user?.role;
    if (role !== "ADMIN") {
      const url = req.nextUrl.clone();
      url.pathname = `/${locale}/login`;
      url.searchParams.set("callbackUrl", pathname);
      url.searchParams.set("staff", "1");
      return NextResponse.redirect(url);
    }
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|txt|xml)$).*)"],
};
