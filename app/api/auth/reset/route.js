// app/api/auth/reset/route.js
import { NextResponse } from "next/server";
import { sql } from "@vercel/postgres";
import crypto from "crypto";
import bcrypt from "bcryptjs";

export async function POST(req) {
  try {
    const { searchParams } = new URL(req.url);
    const token = searchParams.get("token") || "";

    const { password } = await req.json();

    if (!token) {
      return NextResponse.json({ error: "Missing token." }, { status: 400 });
    }
    if (!password || password.length < 8) {
      return NextResponse.json(
        { error: "Password must be at least 8 characters." },
        { status: 400 }
      );
    }

    const tokenHash = crypto.createHash("sha256").update(token).digest("hex");

    const { rows } = await sql`
      SELECT id, email, expires_at, used_at
      FROM reset_tokens
      WHERE token_hash = ${tokenHash}
      ORDER BY created_at DESC
      LIMIT 1
    `;

    const row = rows[0];

    if (!row) {
      return NextResponse.json(
        { error: "Invalid or expired token." },
        { status: 400 }
      );
    }

    if (row.used_at) {
      return NextResponse.json(
        { error: "Invalid or expired token." },
        { status: 400 }
      );
    }

    if (new Date(row.expires_at) < new Date()) {
      return NextResponse.json(
        { error: "Invalid or expired token." },
        { status: 400 }
      );
    }

    const passwordHash = await bcrypt.hash(password, 10);

    await sql`
      UPDATE users
      SET password_hash = ${passwordHash}
      WHERE email = ${row.email}
    `;

    await sql`
      UPDATE reset_tokens
      SET used_at = now()
      WHERE id = ${row.id}
    `;

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[RESET][ERROR]", err);
    return NextResponse.json(
      { error: "Could not reset password." },
      { status: 500 }
    );
  }
}
