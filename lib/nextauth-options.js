// /lib/nextauth-options.js
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcrypt";
import { q } from "@/lib/db";

const isProd = process.env.NODE_ENV === "production";

export const authOptions = {
  //
  // IMPORTANT: Must match your Vercel NEXTAUTH_SECRET
  //
  secret: process.env.NEXTAUTH_SECRET,

  //
  // Use JWT because it's easier with custom DB schemas
  //
  session: {
    strategy: "jwt",
  },

  //
  // Helpful while we’re still stabilizing everything
  //
  debug: !isProd,

  //
  // FIXED COOKIE CONFIG — makes login persist on all pages
  //
  cookies: {
    sessionToken: {
      name: isProd ? "__Secure-next-auth.session-token" : "next-auth.session-token",
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: isProd,
      },
    },
  },

  //
  // Providers
  //
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

        const ok = await bcrypt.compare(password, user.password_hash || "");

        if (!ok) {
          console.log("[LOGIN][WARN] Incorrect password for:", email);
          return null;
        }

        console.log("[LOGIN][SUCCESS] Logged in:", email);

        return {
          id: String(user.id),
          email: user.email,
          role: user.role,
          name: user.name ?? user.email,
        };
      },
    }),
  ],

  //
  // Callbacks — attach role + id to tokens and session
  //
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

    //
    // 🔥 Redirect after login — FIX for staying on login page
    //
    async redirect({ url, baseUrl }) {
      // Always redirect to dashboard after valid login
      if (url.startsWith("/")) return baseUrl + "/dashboard";
      return url;
    },
  },

  //
  // Custom pages
  //
  pages: {
    signIn: "/login",
  },
};
