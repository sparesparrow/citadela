import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: "GUEST" | "ADMIN";
    } & DefaultSession["user"];
  }

  interface User {
    role?: "GUEST" | "ADMIN";
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    uid?: string;
    role?: "GUEST" | "ADMIN";
  }
}
