import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import authConfig from "@/lib/auth.config";

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  adapter: PrismaAdapter(prisma),
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

        // TEMPORARY: Guest login for demo purposes
        if (email === "guest@gwago.com" && credentials.password === "guest") {
          return {
            id: "guest-id",
            name: "Guest User",
            email: "guest@gwago.com",
            role: "ADMIN",
          };
        }

        const user = await prisma.user.findUnique({ where: { email } });

        if (!user || !user.password) return null;

        const isValid = await bcrypt.compare(
          credentials.password as string,
          user.password,
        );

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
    // Block sign-in for non-admin emails
    async signIn({ user }) {
      if (!user.email) return false;

      // TEMPORARY: Allow guest login for demo purposes
      if (user.email === "guest@gwago.com") return true;

      const adminEmails = (process.env.ADMIN_EMAILS || "")
        .split(",")
        .map((e) => e.trim().toLowerCase());

      return adminEmails.includes(user.email.toLowerCase());
    },
    // Attach user id and role to JWT
    async jwt({ token, user }) {
      if (user) {
        // TEMPORARY: Handle guest user token for demo purposes
        if (user.email === "guest@gwago.com") {
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
        }
      }
      return token;
    },
  },
});
