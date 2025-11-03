// app/api/auth/[...nextauth]/route.js
import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { q } from "@/lib/db";
import bcrypt from "bcryptjs";

// Make this a named export so other files can `import { authOptions } ...`
export const authOptions = {
  session: { strategy: "jwt" },

  providers: [
    CredentialsProvider({
      name: "Email & Password",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        const email = credentials?.email?.trim().toLowerCase();
        const password = credentials?.password || "";

        if (!email || !password) return null;

        const { rows } = await q(
          `SELECT id, email, name, role, password_hash
             FROM users
            WHERE LOWER(email) = $1
            LIMIT 1`,
          [email]
        );

        const user = rows?.[0];
        if (!user?.password_hash) return null;

        const ok = await bcrypt.compare(password, user.password_hash);
        if (!ok) return null;

        // Return minimal user object for JWT
        return {
          id: String(user.id),
          email: user.email,
          name: user.name || "",
          role: user.role || "customer",
        };
      },
    }),
  ],

  callbacks: {
    async jwt({ token, user }) {
      // On login, merge user fields into token
      if (user) {
        token.id = user.id;
        token.role = user.role;
        token.email = user.email;
        token.name = user.name;
      }
      return token;
    },
    async session({ session, token }) {
      // Expose role/id on session
      session.user = session.user || {};
      session.user.id = token.id;
      session.user.role = token.role;
      session.user.email = token.email;
      session.user.name = token.name;
      return session;
    },
  },

  pages: {
    signIn: "/login",
  },
};

const handler = NextAuth(authOptions);

// Required exports for App Router
export { handler as GET, handler as POST };
