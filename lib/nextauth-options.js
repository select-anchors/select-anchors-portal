// /lib/nextauth-options.js
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcrypt";
import { q } from "@/lib/db";

const isProd = process.env.NODE_ENV === "production";

export const authOptions = {
  // Make sure this matches the value you have in Vercel -> Environment Variables
  secret: process.env.NEXTAUTH_SECRET,

  session: {
    strategy: "jwt",
  },

  // Helpful while we're still dialing things in
  debug: !isProd,

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

        console.log("[LOGIN][DEBUG] Attempt:", email);

        // Look up user by email
        const { rows } = await q(
          `SELECT id, email, password_hash, role, name
             FROM users
            WHERE email = $1
            LIMIT 1`,
          [email]
        );

        const user = rows[0];

        if (!user) {
          console.log("[LOGIN][WARN] No user found:", email);
          return null;
        }

        // Compare password with stored hash
        const ok = await bcrypt.compare(password, user.password_hash || "");

        if (!ok) {
          console.log("[LOGIN][WARN] Incorrect password for:", email);
          return null;
        }

        console.log("[LOGIN][SUCCESS] Logged in:", email);

        // This object becomes `user` in the jwt callback
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
      // When user logs in, copy their data into the token
      if (user) {
        token.uid = user.id;
        token.role = user.role;
      }
      // console.log("[JWT][DEBUG]", token);
      return token;
    },

    async session({ session, token }) {
      // Expose our custom fields on `session.user`
      if (session?.user) {
        session.user.id = token.uid;
        session.user.role = token.role;
      }
      // console.log("[SESSION][DEBUG]", session);
      return session;
    },
  },

  pages: {
    signIn: "/login",
  },
};
