// app/api/auth/[...nextauth]/route.js
import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcrypt";
import { q } from "@/lib/db";

// If you see "Edge runtime" errors, we force Node so bcrypt works:
export const runtime = "nodejs";
// Avoid static optimization so NextAuth can read cookies each request:
export const dynamic = "force-dynamic";

const authOptions = {
  // IMPORTANT: set NEXTAUTH_SECRET in Vercel env vars
  secret: process.env.NEXTAUTH_SECRET,
  session: { strategy: "jwt" },

  providers: [
    CredentialsProvider({
      name: "Email & Password",
      credentials: {
        email: { label: "Email", type: "text" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        const email =
          credentials?.email?.toString().trim().toLowerCase() ?? "";
        const password = credentials?.password?.toString() ?? "";

        if (!email || !password) return null;

        // Fetch user record
        const { rows } = await q(
          `SELECT id, email, password_hash, role
             FROM users
            WHERE lower(email)=lower($1)
            LIMIT 1`,
          [email]
        );
        const user = rows?.[0];
        if (!user?.password_hash) return null;

        // Validate password
        const ok = await bcrypt.compare(password, user.password_hash);
        if (!ok) return null;

        // What gets merged into the JWT / session
        return { id: user.id, email: user.email, role: user.role };
      }
    })
  ],

  callbacks: {
    async jwt({ token, user }) {
      // On first sign-in, copy role/id from user into the token
      if (user) {
        token.role = user.role;
        token.uid = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      // Expose role/id to the client
      if (session?.user) {
        session.user.role = token.role;
        session.user.id = token.uid;
      }
      return session;
    }
  },

  // Optional: use your custom pages (already in your repo)
  pages: {
    signIn: "/login",
    error: "/login"
  }
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
