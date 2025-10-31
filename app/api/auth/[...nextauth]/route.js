// app/api/auth/[...nextauth]/route.js
import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { q } from "@/lib/db";
import bcrypt from "bcrypt";

const handler = NextAuth({
  secret: process.env.NEXTAUTH_SECRET,
  session: {
    strategy: "jwt",
  },
  providers: [
    CredentialsProvider({
      id: "credentials",
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "text" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials, req) {
        const email = credentials?.email?.toLowerCase?.();
        const password = credentials?.password;
        if (!email || !password) return null;

        const { rows } = await q(
          `SELECT id, email, password_hash, role FROM users WHERE email = $1 LIMIT 1`,
          [email]
        );

        const user = rows[0];
        if (!user || !user.password_hash) return null;

        const match = await bcrypt.compare(password, user.password_hash);
        if (!match) return null;

        return { id: user.id, email: user.email, role: user.role };
      }
    })
  ],

  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = user.role || token.role;
      }
      return token;
    },
    async session({ session, token }) {
      session.user.role = token.role;
      return session;
    }
  },
  pages: {
    signIn: "/login", // your custom route
    error: "/login"   // show errors on login page
  }
});

export { handler as GET, handler as POST };
