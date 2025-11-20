// app/api/auth/reset/route.js
import { NextResponse } from "next/server";
import { sql } from "@vercel/postgres";
import bcrypt from "bcrypt";
import crypto from "crypto";

export async function POST(req) {
  try {
    const { token, password } = await req.json();

    if (!token) {
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

    const nowIso = new Date().toISOString();
    const tokenHash = crypto.createHash("sha256").update(token).digest("hex");

    // Find matching reset token (new or legacy)
    const { rows } = await sql`
      SELECT *
      FROM reset_tokens
      WHERE (token_hash = ${tokenHash} OR token = ${token})
        AND used_at IS NULL
        AND expires_at > ${nowIso}
      ORDER BY created_at DESC
      LIMIT 1
    `;

    const row = rows[0];

    if (!row) {
      console.warn("[RESET][WARN] Token not found or expired:", token);
      return NextResponse.json(
        { error: "Invalid or expired token." },
        { status: 400 }
      );
    }

    const email = row.email.toLowerCase().trim();

    // Hash new password
    const passwordHash = await bcrypt.hash(password, 10);

    // Update user record
    await sql`
      UPDATE users
      SET password_hash = ${passwordHash}
      WHERE email = ${email}
    `;

    // Mark token used
    await sql`
      UPDATE reset_tokens
      SET used_at = ${nowIso}
      WHERE id = ${row.id}
    `;

    console.log("[RESET][DEBUG] Password updated for", email);

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[RESET][ERROR] Unexpected error in /api/auth/reset:", err);
    return NextResponse.json(
      { error: "Could not reset password." },
      { status: 500 }
    );
  }
}
