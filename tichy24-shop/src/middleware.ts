import NextAuth from "next-auth";
import type { Session } from "next-auth";
import { NextResponse, type NextRequest } from "next/server";
import { authConfig } from "@/auth.config";

/** Pozadavek obohaceny Auth.js o prihlasenou relaci. */
type AuthedRequest = NextRequest & { auth: Session | null };

const { auth } = NextAuth(authConfig);

/**
 * Chrani administraci. Verejny obchod middlewarem NEPROCHAZI (viz matcher),
 * takze katalog zustava rychly. Skutecna autorizace se overuje jeste jednou
 * v kazde admin strance a server action pres requireAdmin() — tohle je jen
 * prvni, levna bariera.
 */
export default auth((req: AuthedRequest) => {
  const { pathname } = req.nextUrl;

  // Prihlasovaci stranka samozrejme musi byt dostupna bez prihlaseni.
  if (pathname === "/admin/login") return NextResponse.next();

  if (req.auth?.user?.role !== "ADMIN") {
    const url = req.nextUrl.clone();
    url.pathname = "/admin/login";
    url.search = "";
    url.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/admin/:path*"],
};
