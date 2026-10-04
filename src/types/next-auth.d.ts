import { DefaultSession, DefaultUser } from "next-auth";
import { JWT } from "next-auth/jwt";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: "CUSTOMER" | "ADMIN";
      phone: string;
    } & DefaultSession["user"];
  }

  interface User extends DefaultUser {
    role: "CUSTOMER" | "ADMIN";
    phone: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: "CUSTOMER" | "ADMIN";
    phone: string;
  }
}
