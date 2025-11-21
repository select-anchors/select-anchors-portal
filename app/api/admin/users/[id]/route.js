// /app/api/admin/users/[id]/route.js
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/nextauth-options";
import { q } from "@/lib/db";

async function requireAdmin() {
  const session = await getServerSession(authOptions);
  if (!session || session.user?.role !== "admin") {
    console.warn("[ADMIN_USERS][ID][AUTH] Unauthorized access attempt");
    return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }
  return { session };
}

export async function PATCH(req, { params }) {
  const gate = await requireAdmin();
  if (gate.error) return gate.error;

  try {
    const body = await req.json();
    const id = params.id;

    let { name, email, role, is_active } = body;

    // Normalize email if provided
    let normalizedEmail = null;
    if (typeof email === "string" && email.trim() !== "") {
      normalizedEmail = email.trim().toLowerCase();

      // Check for duplicate email on another user (case-insensitive)
      const { rows: dup } = await q(
        `SELECT id FROM users WHERE LOWER(email) = $1 AND id <> $2`,
        [normalizedEmail, id]
      );
      if (dup.length) {
        return NextResponse.json(
          { error: "Another user already has this email." },
          { status: 400 }
        );
      }
    }

    console.log("[ADMIN_USERS][ID][PATCH] Updating user", {
      id,
      hasName: name != null,
      email: normalizedEmail,
      role,
      is_active,
    });

    await q(
      `UPDATE users
          SET name = COALESCE($1, name),
              email = COALESCE($2, email),
              role = COALESCE($3, role),
              is_active = COALESCE($4, is_active)
        WHERE id = $5`,
      [
        name ?? null,
        normalizedEmail ?? null,
        role ?? null,
        typeof is_active === "boolean" ? is_active : null,
        id,
      ]
    );

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[ADMIN_USERS][ID][PATCH][ERROR]", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function DELETE(_req, { params }) {
  const gate = await requireAdmin();
  if (gate.error) return gate.error;

  try {
    const id = params.id;
    console.log("[ADMIN_USERS][ID][DELETE] Deleting user", id);

    await q(`DELETE FROM users WHERE id = $1`, [id]);
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[ADMIN_USERS][ID][DELETE][ERROR]", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
