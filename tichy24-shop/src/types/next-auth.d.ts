import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role?: "ADMIN";
    } & DefaultSession["user"];
  }

  interface User {
    role?: "ADMIN";
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    uid?: string;
    role?: "ADMIN";
  }
}
