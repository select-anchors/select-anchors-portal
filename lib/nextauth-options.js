// /lib/nextauth-options.js
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { q } from "@/lib/db";

export const authOptions = {
  session: { strategy: "jwt" },

  providers: [
    CredentialsProvider({
      name: "Email & Password",
      credentials: {
        email: { label: "Email", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const email = (credentials?.email || "").toLowerCase().trim();
        const password = credentials?.password || "";

        // Grab user
        const { rows } = await q(
          `SELECT id, email, password_hash, role, name
             FROM users
            WHERE email = $1
            LIMIT 1`,
          [email]
        );
        const user = rows[0];
        if (!user) return null;

        // Compare password
        const ok = await bcrypt.compare(password, user.password_hash || "");
        if (!ok) return null;

        // Return the session-safe user
        return {
          id: String(user.id),
          email: user.email,
          role: user.role,
          name: user.name ?? user.email,
        };
      },
    }),
  ],

  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.uid = user.id;
        token.role = user.role;
      }
      return token;
    },
    async session({ session, token }) {
      if (session?.user) {
        session.user.id = token.uid;
        session.user.role = token.role;
      }
      return session;
    },
  },

  pages: {
    signIn: "/login",
  },
};
