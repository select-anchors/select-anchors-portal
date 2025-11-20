// /app/api/auth/reset/route.js
import { NextResponse } from "next/server";
import { sql } from "@vercel/postgres";
import bcrypt from "bcryptjs";

export async function POST(req) {
  try {
    const { token, password } = await req.json();

    if (!token) {
      console.error("[RESET][ERROR] Missing token in body");
      return NextResponse.json(
        { error: "Missing token." },
        { status: 400 }
      );
    }

    if (!password || password.length < 8) {
      return NextResponse.json(
        { error: "Password must be at least 8 characters." },
        { status: 400 }
      );
    }

    // 1) Find a valid reset token row – match directly on the plain token
    const { rows } =
      await sql`SELECT * FROM reset_tokens WHERE token = ${token} AND used_at IS NULL AND expires_at > NOW() LIMIT 1`;

    if (!rows.length) {
      console.warn("[RESET][WARN] Token not found or expired:", token);
      return NextResponse.json(
        { error: "Invalid or expired token." },
        { status: 400 }
      );
    }

    const resetRow = rows[0];

    // 2) Hash the new password
    const hash = await bcrypt.hash(password, 10);

    // 3) Update the user's password
    await sql`
      UPDATE users
      SET password_hash = ${hash}
      WHERE email = ${resetRow.email}
    `;

    // 4) Mark this reset token as used so it can't be reused
    await sql`
      UPDATE reset_tokens
      SET used_at = NOW()
      WHERE id = ${resetRow.id}
    `;

    console.log(
      "[RESET][INFO] Password updated for",
      resetRow.email,
      "via token",
      resetRow.id
    );

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[RESET][ERROR] Unexpected error:", err);
    return NextResponse.json(
      { error: "Could not reset password." },
      { status: 500 }
    );
  }
}
