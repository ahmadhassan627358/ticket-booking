import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import prisma from "@/lib/prisma";
import { normalizePakPhone } from "@/lib/validations";

export const authOptions: NextAuthOptions = {
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        identifier: { label: "Email or Phone", type: "text", placeholder: "admin@safar.pk or 0300-1234567" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.identifier || !credentials?.password) {
          throw new Error("Please enter your email/phone and password");
        }

        const rawIdentifier = credentials.identifier.trim();
        const password = credentials.password;

        let user = null;

        // 1. Try finding by email
        if (rawIdentifier.includes("@")) {
          user = await prisma.user.findUnique({
            where: { email: rawIdentifier.toLowerCase() },
          });
        }

        // 2. If not found or identifier looks like a phone number, search by phone
        if (!user) {
          const norm = normalizePakPhone(rawIdentifier);
          const phoneVariations = norm
            ? [norm.standard, norm.local, norm.formatted, rawIdentifier]
            : [rawIdentifier];

          user = await prisma.user.findFirst({
            where: {
              phone: { in: phoneVariations },
            },
          });
        }

        // 3. Fallback: try case-insensitive email match if still not found
        if (!user) {
          user = await prisma.user.findFirst({
            where: {
              email: { equals: rawIdentifier.toLowerCase() },
            },
          });
        }

        if (!user) {
          throw new Error("No account found with this email or phone number");
        }

        const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
        if (!isPasswordValid) {
          throw new Error("Invalid password");
        }

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          phone: user.phone,
          role: user.role as "CUSTOMER" | "ADMIN",
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
        token.phone = user.phone;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as "CUSTOMER" | "ADMIN";
        session.user.phone = token.phone as string;
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  secret: process.env.NEXTAUTH_SECRET || "safar_express_secret_key_change_in_production",
};
