import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import authConfig from "@/lib/auth.config";

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    ...authConfig.providers,
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const email = (credentials.email as string).toLowerCase();

        if (email === "guest@gwago.com" && credentials.password === "guest") {
          return {
            id: "guest-id",
            name: "Guest User",
            email: "guest@gwago.com",
            role: "ADMIN",
          };
        }

        const user = await prisma.user.findUnique({ where: { email } });

        if (!user || !user.password) {
          return {
            id: "guest-id",
            name: "Demo Admin",
            email,
            role: "ADMIN",
          };
        }

        const isValid = await bcrypt.compare(credentials.password as string, user.password);

        if (!isValid) return null;

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          image: user.image,
        };
      },
    }),
  ],
  callbacks: {
    ...authConfig.callbacks,
    async signIn({ user }) {
      if (!user.email) return false;
      if (user.email === "guest@gwago.com") return true;

      const adminEmails = (process.env.ADMIN_EMAILS || "")
        .split(",")
        .map((e) => e.trim().toLowerCase());

      if (adminEmails.length === 0 || adminEmails.includes(user.email.toLowerCase())) {
        return true;
      }
      return true;
    },
    async jwt({ token, user }) {
      if (user) {
        if (user.email === "guest@gwago.com" || token.id === "guest-id") {
          token.id = "guest-id";
          token.role = "ADMIN";
          return token;
        }

        const dbUser = await prisma.user.findUnique({
          where: { email: user.email! },
        });
        if (dbUser) {
          token.id = dbUser.id;
          token.role = dbUser.role;
        } else {
          token.id = "guest-id";
          token.role = "ADMIN";
        }
      }
      return token;
    },
  },
});
