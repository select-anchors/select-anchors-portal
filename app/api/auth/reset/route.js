// app/api/auth/reset/route.js
import { NextResponse } from "next/server";
import { q } from "@/lib/db";

// Small helper to load bcryptjs and guard against missing dep in prod
async function getBcrypt() {
  try {
    const mod = await import("bcryptjs");
    return mod.default || mod;
  } catch (err) {
    // If we're on Vercel or NODE_ENV=production, fail loudly
    if (process.env.VERCEL || process.env.NODE_ENV === "production") {
      throw new Error(
        "bcryptjs is not installed. Add \"bcryptjs\": \"^2.4.3\" to dependencies and redeploy."
      );
    }
    // For local/dev we could offer a weak fallback, but better to fix dep.
    throw new Error(
      "bcryptjs missing in dev. Please run: npm install bcryptjs"
    );
  }
}

function validatePassword(pw) {
  if (typeof pw !== "string") return "Password is required.";
  if (pw.length < 8) return "Password must be at least 8 characters.";
  if (pw.length > 128) return "Password is too long.";
  return null;
}

export async function POST(req) {
  try {
    const body = await req.json().catch(() => ({}));
    const { token, password } = body || {};

    if (!token) {
      return NextResponse.json({ error: "Missing reset token." }, { status: 400 });
    }

    const pwErr = validatePassword(password);
    if (pwErr) {
      return NextResponse.json({ error: pwErr }, { status: 400 });
    }

    // 1) Look up valid token
    const tokRes = await q(
      `SELECT user_id
         FROM password_reset_tokens
        WHERE token = $1
          AND expires_at > now()
        LIMIT 1`,
      [token]
    );

    if (!tokRes.rows?.length) {
      return NextResponse.json({ error: "Invalid or expired reset link." }, { status: 400 });
    }

    const userId = tokRes.rows[0].user_id;

    // 2) Hash the new password
    const bcrypt = await getBcrypt();
    const saltRounds = 12;
    const hash = await bcrypt.hash(password, saltRounds);

    // 3) Update user & consume the token in a transaction
    await q("BEGIN");
    try {
      await q(`UPDATE users SET password_hash = $1 WHERE id = $2`, [hash, userId]);
      await q(`DELETE FROM password_reset_tokens WHERE token = $1`, [token]);
      await q("COMMIT");
    } catch (inner) {
      await q("ROLLBACK");
      throw inner;
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    // Surface helpful error in logs; return generic to client
    console.error("RESET ERROR:", err);
    return NextResponse.json(
      { error: "Could not reset password." },
      { status: 500 }
    );
  }
}
