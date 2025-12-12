// app/api/account/route.js
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/nextauth-options";
import { q } from "@/lib/db";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const id = String(session.user.id).trim();

  try {
    const { rows } = await q(
      `
      SELECT id, name, email, phone, company_name
      FROM users
      WHERE id::text = $1
      LIMIT 1
      `,
      [id]
    );

    if (!rows.length) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json({ user: rows[0] });
  } catch (err) {
    console.error("GET /api/account error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function PATCH(req) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const id = String(session.user.id).trim();
  const body = await req.json().catch(() => ({}));

  const { name, email, phone } = body;

  try {
    const { rows } = await q(
      `
      UPDATE users
      SET
        name  = COALESCE($1, name),
        email = COALESCE($2, email),
        phone = COALESCE($3, phone)
      WHERE id::text = $4
      RETURNING id, name, email, phone, company_name
      `,
      [name ?? null, email ?? null, phone ?? null, id]
    );

    if (!rows.length) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json({ user: rows[0] });
  } catch (err) {
    console.error("PATCH /api/account error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
