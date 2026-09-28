import Google from "next-auth/providers/google";
import type { NextAuthConfig } from "next-auth";

const adminEmails = (process.env.ADMIN_EMAILS || "").split(",").map((e) => e.trim().toLowerCase());

export default {
  session: { strategy: "jwt" },
  pages: {
    signIn: "/",
  },
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  callbacks: {
    async signIn({ user }) {
      if (!user.email) return false;
      return adminEmails.includes(user.email.toLowerCase());
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as string;
      }
      return session;
    },
    authorized({ auth, request: { nextUrl } }) {
      const isAdminRoute = nextUrl.pathname.startsWith("/admin");
      if (isAdminRoute && !auth) return false;
      return true;
    },
  },
} satisfies NextAuthConfig;
