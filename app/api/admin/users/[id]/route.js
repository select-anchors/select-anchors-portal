// /app/api/admin/users/[id]/route.js
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { q } from "@/lib/db";

async function requireAdmin() {
  const session = await getServerSession(authOptions);
  if (!session || session.user?.role !== "admin") {
    return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }
  return { session };
}

export async function PATCH(_req, { params }) {
  const gate = await requireAdmin();
  if (gate.error) return gate.error;

  try {
    const body = await _req.json();
    const { name, email, role, is_active } = body;
    const id = params.id;

    await q(
      `UPDATE users
          SET name = COALESCE($1, name),
              email = COALESCE($2, email),
              role = COALESCE($3, role),
              is_active = COALESCE($4, is_active)
        WHERE id = $5`,
      [name ?? null, email ?? null, role ?? null, is_active, id]
    );

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function DELETE(_req, { params }) {
  const gate = await requireAdmin();
  if (gate.error) return gate.error;

  try {
    const id = params.id;
    await q(`DELETE FROM users WHERE id = $1`, [id]);
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
