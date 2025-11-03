import CredentialsProvider from "next-auth/providers/credentials";
import { q } from "@/lib/db";
import bcrypt from "bcryptjs";

export const authOptions = {
  secret: process.env.NEXTAUTH_SECRET,
  session: { strategy: "jwt" },
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: { email: {}, password: {} },
      async authorize(creds) {
        const email = creds?.email?.toLowerCase?.();
        const pass = creds?.password;
        if (!email || !pass) return null;
        const { rows } = await q(`SELECT id,email,password_hash,role FROM users WHERE email=$1 LIMIT 1`, [email]);
        const u = rows[0];
        if (!u?.password_hash) return null;
        const ok = await bcrypt.compare(pass, u.password_hash);
        return ok ? { id: u.id, email: u.email, role: u.role } : null;
      }
    })
  ],
  callbacks: {
    async jwt({ token, user }) { if (user) token.role = user.role; return token; },
    async session({ session, token }) { session.user.role = token.role; return session; }
  },
  pages: { signIn: "/login", error: "/login" }
};
