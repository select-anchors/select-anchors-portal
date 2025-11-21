// /lib/nextauth-options.js
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcrypt";
import { q } from "@/lib/db";
import { cookies } from "next/headers";

const isProd = process.env.NODE_ENV === "production";

export const authOptions = {
  //
  // Must match your NEXTAUTH_SECRET from Vercel env vars
  //
  secret: process.env.NEXTAUTH_SECRET,

  session: {
    strategy: "jwt",
  },

  debug: !isProd,

  //
  // Explicit cookie config so sessions stick reliably
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

  callbacks: {
    //
    // Put user info into the JWT
    //
    async jwt({ token, user }) {
      if (user) {
        token.uid = user.id;
        token.role = user.role;
      }
      return token;
    },

    //
    // Put JWT info into session AND sync sa_* cookies
    //
    async session({ session, token }) {
      const cookieStore = cookies();

      if (session?.user) {
        session.user.id = token.uid;
        session.user.role = token.role;

        // Default role so things don't break
        const role = session.user.role || "customer";

        // Sync legacy cookies used by middleware/other code
        cookieStore.set("sa_user", String(session.user.id), {
          httpOnly: true,
          sameSite: "lax",
          path: "/",
          secure: isProd,
        });

        cookieStore.set("sa_role", role, {
          httpOnly: true,
          sameSite: "lax",
          path: "/",
          secure: isProd,
        });
      } else {
        // No session? Clean up legacy cookies.
        cookieStore.delete("sa_user");
        cookieStore.delete("sa_role");
      }

      return session;
    },

    //
    // Redirect after auth actions
    //
    async redirect({ url, baseUrl }) {
      // After a successful login, NextAuth will usually call redirect
      // with a relative URL (e.g. "/").
      // We always send them to /dashboard in that case.
      try {
        const parsed = new URL(url, baseUrl);

        if (parsed.origin === baseUrl) {
          // For any in-site redirect, go to /dashboard
          return `${baseUrl}/dashboard`;
        }
      } catch {
        // If URL parsing explodes, just fall back
      }

      return `${baseUrl}/dashboard`;
    },
  },

  pages: {
    signIn: "/login",
  },
};
