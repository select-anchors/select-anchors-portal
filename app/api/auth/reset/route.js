// /app/api/auth/reset/route.js
import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { q } from "@/lib/db";

export async function POST(req) {
  try {
    const { token, password } = await req.json();
    if (!token || !password)
      return NextResponse.json({ error: "Missing token or password" }, { status: 400 });

    // Lookup valid token
    const { rows } = await q(
      `SELECT r.user_id, u.email
         FROM password_resets r
         JOIN users u ON r.user_id = u.id
        WHERE r.token = $1
          AND r.expires_at > NOW()`,
      [token]
    );

    if (!rows.length)
      return NextResponse.json({ error: "Invalid or expired reset link" }, { status: 400 });

    const userId = rows[0].user_id;
    const hash = await bcrypt.hash(password, 10);

    await q(`UPDATE users SET password = $1 WHERE id = $2`, [hash, userId]);
    await q(`DELETE FROM password_resets WHERE user_id = $1`, [userId]);

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
