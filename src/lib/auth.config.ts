import Google from "next-auth/providers/google";
import type { NextAuthConfig } from "next-auth";

// Comma-separated admin emails from env
const adminEmails = (process.env.ADMIN_EMAILS || "")
  .split(",")
  .map((e) => e.trim().toLowerCase());

// Edge-compatible auth config — NO adapter, NO Prisma imports
// This file is imported by middleware (Edge Runtime)
export default {
  session: { strategy: "jwt" }, // Stateless JWT — Vercel-friendly
  pages: {
    signIn: "/", // Landing page doubles as login
  },
  providers: [
    // Google OAuth for admin login
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  callbacks: {
    // Only allow admin emails
    async signIn({ user }) {
      if (!user.email) return false;
      return adminEmails.includes(user.email.toLowerCase());
    },
    // Expose id and role on the session object
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as string;
      }
      return session;
    },
    // Check for admin route access
    authorized({ auth, request: { nextUrl } }) {
      const isAdminRoute = nextUrl.pathname.startsWith("/admin");
      if (isAdminRoute && !auth) return false;
      return true;
    },
  },
} satisfies NextAuthConfig;
