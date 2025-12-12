// app/api/admin/users/[id]/route.js
import { NextResponse } from "next/server";
import { q } from "@/lib/db";

// GET /api/admin/users/:id  -> fetch single user
export async function GET(_req, { params }) {
  try {
    const id = Number(params.id);
    if (!id || Number.isNaN(id)) {
      return NextResponse.json({ error: "Invalid user id" }, { status: 400 });
    }

    const { rows } = await q(
      `
      SELECT
        id,
        name,
        email,
        role,
        is_active,
        created_at
      FROM users
      WHERE id = $1
      LIMIT 1
      `,
      [id]
    );

    if (rows.length === 0) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json(rows[0]);
  } catch (err) {
    console.error("GET /api/admin/users/[id] error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

// PUT /api/admin/users/:id  -> update user fields
export async function PUT(req, { params }) {
  try {
    const id = Number(params.id);
    if (!id || Number.isNaN(id)) {
      return NextResponse.json({ error: "Invalid user id" }, { status: 400 });
    }

    const body = await req.json();

    const {
      name,
      email,
      role,
      is_active,
    } = body;

    const { rows } = await q(
      `
      UPDATE users
      SET
        name      = COALESCE($1, name),
        email     = COALESCE($2, email),
        role      = COALESCE($3, role),
        is_active = COALESCE($4, is_active)
      WHERE id = $5
      RETURNING
        id,
        name,
        email,
        role,
        is_active,
        created_at
      `,
      [
        name ?? null,
        email ?? null,
        role ?? null,
        typeof is_active === "boolean" ? is_active : null,
        id,
      ]
    );

    if (rows.length === 0) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json(rows[0]);
  } catch (err) {
    console.error("PUT /api/admin/users/[id] error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
