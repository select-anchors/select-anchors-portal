// app/api/auth/signup/route.js
import { q } from "@/lib/db";
import bcrypt from "bcryptjs";

export async function POST(req) {
  const body = await req.json();
  const email = (body.email || "").toLowerCase();
  const password = body.password;
  const role = body.role || "customer";

  if (!email || !password) {
    return new Response(JSON.stringify({ error: "Email and password required" }), { status: 400 });
  }

  const hash = await bcrypt.hash(password, 10);

  try {
    const { rows } = await q(
      `INSERT INTO users (email, password_hash, role) VALUES ($1, $2, $3) RETURNING id, email, role`,
      [email, hash, role]
    );
    const user = rows[0];
    return new Response(JSON.stringify({ user }), { status: 201 });
  } catch (err) {
    console.error(err);
    return new Response(JSON.stringify({ error: "Could not create user" }), { status: 500 });
  }
}
