// /app/api/admin/users/[id]/route.js
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/nextauth-options";
import { q } from "@/lib/db";

async function requireAdmin() {
  const session = await getServerSession(authOptions);
  if (!session || session.user?.role !== "admin") {
    console.warn("[ADMIN_USERS][ID][AUTH] Unauthorized access attempt");
    return {
      error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }
  return { session };
}

// GET /api/admin/users/[id] - single user details for admin
export async function GET(_req, { params }) {
  const gate = await requireAdmin();
  if (gate.error) return gate.error;

  const id = Number(params.id);
  if (!id) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  try {
    const { rows } = await q(
      `
        SELECT id,
               name,
               email,
               role,
               is_active,
               phone,
               company_name,
               created_at
        FROM users
        WHERE id = $1
      `,
      [id]
    );

    if (!rows.length) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    return NextResponse.json({ user: rows[0] });
  } catch (e) {
    console.error("[ADMIN_USERS][ID][GET][ERROR]", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

// PATCH /api/admin/users/[id] - update user fields
export async function PATCH(req, { params }) {
  const gate = await requireAdmin();
  if (gate.error) return gate.error;

  const id = Number(params.id);
  if (!id) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  try {
    const body = await req.json();

    let { name, email, role, is_active, phone, company_name } = body;

    // Normalize email
    email = (email || "").trim().toLowerCase();

    if (!email) {
      return NextResponse.json(
        { error: "Email is required." },
        { status: 400 }
      );
    }

    // Validate role
    const allowedRoles = ["admin", "employee", "customer"];
    if (role && !allowedRoles.includes(role)) {
      return NextResponse.json(
        { error: `Invalid role. Must be one of: ${allowedRoles.join(", ")}` },
        { status: 400 }
      );
    }

    // Check unique email (excluding this user)
    const { rows: dup } = await q(
      `SELECT id FROM users WHERE LOWER(email) = $1 AND id <> $2`,
      [email, id]
    );
    if (dup.length) {
      return NextResponse.json(
        { error: "Another user already has this email." },
        { status: 400 }
      );
    }

    console.log("[ADMIN_USERS][ID][PATCH] Updating user", {
      id,
      name,
      email,
      role,
      is_active,
      phone,
      company_name,
    });

    await q(
      `
        UPDATE users
        SET name = $1,
            email = $2,
            role = $3,
            is_active = $4,
            phone = $5,
            company_name = $6
        WHERE id = $7
      `,
      [
        name || null,
        email,
        role || "customer",
        typeof is_active === "boolean" ? is_active : true,
        phone || null,
        company_name || null,
        id,
      ]
    );

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[ADMIN_USERS][ID][PATCH][ERROR]", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

// DELETE /api/admin/users/[id]
export async function DELETE(_req, { params }) {
  const gate = await requireAdmin();
  if (gate.error) return gate.error;

  try {
    const id = Number(params.id);
    if (!id) {
      return NextResponse.json({ error: "Invalid id" }, { status: 400 });
    }

    console.log("[ADMIN_USERS][ID][DELETE] Deleting user", id);

    await q(`DELETE FROM users WHERE id = $1`, [id]);
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[ADMIN_USERS][ID][DELETE][ERROR]", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
