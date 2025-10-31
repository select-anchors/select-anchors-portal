// app/api/auth/reset/route.js
import { q } from "@/lib/db";
import bcrypt from "bcrypt";

export async function POST(req) {
  const { email, token, newPassword } = await req.json();
  if (!email || !token || !newPassword) {
    return new Response(JSON.stringify({ error: "Missing" }), { status: 400 });
  }

  const { rows } = await q(
    `SELECT id, reset_expires FROM users WHERE email = $1 AND reset_token = $2 LIMIT 1`,
    [email.toLowerCase(), token]
  );

  const user = rows[0];
  if (!user) return new Response(JSON.stringify({ error: "Invalid token" }), { status: 400 });

  if (new Date(user.reset_expires) < new Date()) {
    return new Response(JSON.stringify({ error: "Token expired" }), { status: 400 });
  }

  const hash = await bcrypt.hash(newPassword, 10);

  await q(
    `UPDATE users SET password_hash = $1, reset_token = NULL, reset_expires = NULL, updated_at = now() WHERE id = $2`,
    [hash, user.id]
  );

  return new Response(JSON.stringify({ ok: true }));
}
