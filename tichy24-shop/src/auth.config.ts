import type { NextAuthConfig } from "next-auth";

/**
 * Edge-safe cast konfigurace: zadny Prisma ani bcrypt, takze ji muze pouzit
 * middleware. Providery a overovani hesla jsou v auth.ts.
 *
 * Prihlasovani existuje jen pro personal obchodu. Zakaznici ucet nemaji.
 */
export const authConfig = {
  providers: [],
  pages: {
    signIn: "/admin/login",
    error: "/admin/login",
  },
  // Kratsi nez u hotelu: administrace obchodu vidi adresy zakazniku.
  session: { strategy: "jwt", maxAge: 60 * 60 * 24 * 7 },
  trustHost: true,
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.role = (user as { role?: string }).role === "ADMIN" ? "ADMIN" : undefined;
        token.uid = user.id;
      }
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        session.user.id = (token.uid as string) ?? session.user.id;
        session.user.role = token.role === "ADMIN" ? "ADMIN" : undefined;
      }
      return session;
    },
  },
} satisfies NextAuthConfig;

export default authConfig;
