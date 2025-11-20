// /lib/nextauth-options.js
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcrypt";
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
