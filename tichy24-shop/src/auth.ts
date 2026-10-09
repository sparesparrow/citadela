import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { authConfig } from "@/auth.config";

const credentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(200),
});

/** Hash neexistujiciho hesla — porovnava se, kdyz uzivatel neexistuje (viz nize). */
const DUMMY_HASH = "$2a$12$invalidinvalidinvalidinvalidinvalidinvalidinvalidinvalidin";

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      id: "staff",
      name: "Staff",
      credentials: {
        email: { label: "E-Mail", type: "email" },
        password: { label: "Passwort", type: "password" },
      },
      async authorize(raw) {
        const parsed = credentialsSchema.safeParse(raw);
        if (!parsed.success) return null;

        const user = await prisma.adminUser.findUnique({
          where: { email: parsed.data.email.toLowerCase() },
        });

        // Porovname i kdyz uzivatel neexistuje, aby doba odpovedi
        // neprozradila, ktere e-maily jsou v databazi.
        const ok = await bcrypt.compare(parsed.data.password, user?.passwordHash ?? DUMMY_HASH);
        if (!ok || !user) return null;

        return { id: user.id, email: user.email, name: user.name, role: "ADMIN" as const };
      },
    }),
  ],
});

/** Vraci session jen pro admina, jinak null. Druha, skutecna barilera za middlewarem. */
export async function requireAdmin() {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") return null;
  return session;
}
