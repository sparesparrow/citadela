import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { authConfig } from "@/auth.config";

const credentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(200),
});

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  adapter: PrismaAdapter(prisma),
  providers: [
    ...authConfig.providers,
    Credentials({
      id: "staff",
      name: "Staff",
      credentials: {
        email: { label: "E-mail", type: "email" },
        password: { label: "Heslo", type: "password" },
      },
      async authorize(raw) {
        const parsed = credentialsSchema.safeParse(raw);
        if (!parsed.success) return null;

        const user = await prisma.user.findUnique({
          where: { email: parsed.data.email.toLowerCase() },
        });

        // Porovnáme i když uživatel neexistuje, aby doba odpovědi
        // neprozradila, které e-maily jsou v databázi.
        const hash = user?.passwordHash ?? "$2a$12$invalidinvalidinvalidinvalidinvalidinvalidinvalidinvalidin";
        const ok = await bcrypt.compare(parsed.data.password, hash);

        if (!ok || !user || user.role !== "ADMIN") return null;

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.image,
          role: user.role,
        };
      },
    }),
  ],
});

/** Vyhodí chybu, pokud aktuální uživatel není administrátor. */
export async function requireAdmin() {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") return null;
  return session;
}
