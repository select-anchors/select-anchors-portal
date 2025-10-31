import { requireAdmin } from "@/lib/auth-helpers";
import { q } from "@/lib/db";
import bcrypt from "bcrypt";

export async function GET() {
  await requireAdmin();
  const { rows } = await q(`
    SELECT id, email, role, created_at, updated_at
    FROM users
    ORDER BY created_at DESC
    LIMIT 500
  `);
  return new Response(JSON.stringify({ users: rows }), { status: 200 });
}

export async function POST(req) {
  await requireAdmin();
  const { email, password, role = "customer" } = await req.json();
  if (!email || !password) return new Response(JSON.stringify({ error: "email & password required" }), { status: 400 });
  const hash = await bcrypt.hash(password, 10);
  try {
    const { rows } = await q(
      `INSERT INTO users (email, password_hash, role)
       VALUES ($1,$2,$3)
       RETURNING id, email, role, created_at`,
      [email.toLowerCase(), hash, role]
    );
    return new Response(JSON.stringify({ user: rows[0] }), { status: 201 });
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ error: "create failed" }), { status: 500 });
  }
}
