// lib/nextauth-options.js
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcrypt";
import { q } from "./db";

const isProd = process.env.NODE_ENV === "production";

export const authOptions = {
  secret: process.env.NEXTAUTH_SECRET,
  session: {
    strategy: "jwt",
  },
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

        const { rows } = await q(
          `
          SELECT
            u.id,
            u.email,
            u.password_hash,
            u.role,
            u.name,
            u.company_name,
            u.company_id,
            u.permissions_json,
            c.permissions_json AS company_permissions_json
          FROM users u
          LEFT JOIN companies c ON c.id = u.company_id
          WHERE u.email = $1
          LIMIT 1
          `,
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
          company_name: user.company_name ?? "",
          company_id: user.company_id ?? null,
          permissions_json: user.permissions_json ?? null,
          company_permissions_json: user.company_permissions_json ?? null,
        };
      },
    }),
  ],

  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.uid = user.id;
        token.role = user.role;
        token.email = user.email;
        token.company_name = user.company_name ?? "";
        token.company_id = user.company_id ?? null;
        token.permissions_json = user.permissions_json ?? null;
        token.company_permissions_json = user.company_permissions_json ?? null;
      }
      return token;
    },

    async session({ session, token }) {
      if (session?.user) {
        session.user.id = token.uid;
        session.user.role = token.role;
        session.user.email = token.email;
        session.user.company_name = token.company_name ?? "";
        session.user.company_id = token.company_id ?? null;
        session.user.permissions_json = token.permissions_json ?? null;
        session.user.company_permissions_json = token.company_permissions_json ?? null;
      }
      return session;
    },
  },

  pages: {
    signIn: "/login",
  },
};
