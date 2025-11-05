import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { sql } from "@vercel/postgres";

export const dynamic = "force-dynamic";

export async function POST(req) {
  try {
    const { token, password } = await req.json();
    if (!token || !password) return NextResponse.json({ error: "Bad request." }, { status: 400 });

    // find valid token
    const { rows } = await sql`
      SELECT email, expires_at
      FROM reset_tokens
      WHERE token = ${token}
      ORDER BY created_at DESC
      LIMIT 1
    `;

    const row = rows[0];
    if (!row) {
      console.warn("[RESET] Token not found");
      return NextResponse.json({ error: "Invalid or expired token." }, { status: 400 });
    }

    if (new Date(row.expires_at).getTime() < Date.now()) {
      console.warn("[RESET] Token expired");
      return NextResponse.json({ error: "Invalid or expired token." }, { status: 400 });
    }

    // update password
    const hash = await bcrypt.hash(password, 10);
    await sql`UPDATE users SET password_hash = ${hash} WHERE email = ${row.email}`;

    // burn token
    await sql`DELETE FROM reset_tokens WHERE token = ${token}`;

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[RESET] Error:", err);
    return NextResponse.json({ error: "Could not reset password." }, { status: 500 });
  }
}
