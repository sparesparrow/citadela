import type { NextAuthConfig } from "next-auth";
import Google from "next-auth/providers/google";

/**
 * Edge-safe část konfigurace. Neobsahuje Prisma adaptér ani bcrypt,
 * takže ji může použít middleware běžící na edge runtime.
 */
/**
 * Je přihlášení Googlem vůbec nastavené?
 *
 * Bez vyplněných proměnných by Auth.js poslal Google prázdný `client_id`
 * a ten odpoví „Chyba 400: invalid_request“. Radši providera vůbec
 * nezaregistrujeme a tlačítko na přihlašovací stránce skryjeme —
 * nefunkční tlačítko je horší než žádné.
 */
export const isGoogleConfigured = Boolean(
  process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET,
);

export const authConfig = {
  providers: isGoogleConfigured
    ? [
        Google({
          clientId: process.env.AUTH_GOOGLE_ID,
          clientSecret: process.env.AUTH_GOOGLE_SECRET,
          allowDangerousEmailAccountLinking: false,
        }),
      ]
    : [],
  pages: {
    signIn: "/cs/login",
    error: "/cs/login",
  },
  session: { strategy: "jwt", maxAge: 60 * 60 * 24 * 30 },
  trustHost: true,
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.role = (user as { role?: string }).role ?? "GUEST";
        token.uid = user.id;
      }
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        session.user.id = (token.uid as string) ?? session.user.id;
        session.user.role = (token.role as "GUEST" | "ADMIN") ?? "GUEST";
      }
      return session;
    },
  },
} satisfies NextAuthConfig;

export default authConfig;
