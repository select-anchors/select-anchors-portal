// app/api/auth/reset/route.js
import bcrypt from "bcryptjs";
import { q } from "@/lib/db";

export async function POST(req) {
  try {
    const { token, password } = await req.json();

    if (!token || typeof token !== "string") {
      return Response.json({ error: "Invalid or expired token." }, { status: 400 });
    }
    if (!password || password.length < 8) {
      return Response.json({ error: "Password must be at least 8 characters." }, { status: 400 });
    }

    const { rows } = await q(
      `SELECT id FROM users
        WHERE reset_token = $1
          AND (reset_token_expires IS NULL OR reset_token_expires > NOW())
        LIMIT 1`,
      [token]
    );

    if (!rows?.length) {
      return Response.json({ error: "Invalid or expired token." }, { status: 400 });
    }

    const hash = await bcrypt.hash(password, 10);

    await q(
      `UPDATE users
          SET password_hash = $1,
              reset_token = NULL,
              reset_token_expires = NULL
        WHERE id = $2`,
      [hash, rows[0].id]
    );

    return Response.json({ ok: true });
  } catch (err) {
    console.error("RESET ERROR:", err);
    return Response.json({ error: "Could not reset password." }, { status: 500 });
  }
}
