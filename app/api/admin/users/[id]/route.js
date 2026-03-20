// app/api/admin/users/[id]/route.js
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../../../../lib/nextauth-options";
import { q } from "../../../../../lib/db";
import { getDefaultPermissions } from "../../../../../lib/permissions";

async function requireAdmin() {
  const session = await getServerSession(authOptions);
  if (!session || session.user?.role !== "admin") {
    return {
      error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }
  return { session };
}

export async function PATCH(req, { params }) {
  const gate = await requireAdmin();
  if (gate.error) return gate.error;

  try {
    const id = params.id;
    const body = await req.json();

    const allowedRoles = ["admin", "employee", "customer"];
    const role = body.role;
    const companyId = body.company_id || null;

    if (!allowedRoles.includes(role)) {
      return NextResponse.json(
        { error: "Invalid role" },
        { status: 400 }
      );
    }

    let companyRow = null;

    if (companyId) {
      const companyRes = await q(
        `
        SELECT id, name
        FROM companies
        WHERE id = $1
        LIMIT 1
        `,
        [companyId]
      );

      companyRow = companyRes.rows[0] || null;

      if (!companyRow) {
        return NextResponse.json(
          { error: "Invalid company" },
          { status: 400 }
        );
      }
    }

    const mergedPermissions = {
      ...getDefaultPermissions(role),
      ...(body.permissions_json || {}),
    };

    const { rows } = await q(
      `
      UPDATE users
      SET
        role = $1,
        company_id = $2,
        company_name = $3,
        permissions_json = $4::jsonb
      WHERE id = $5
      RETURNING id, role, company_id, company_name, permissions_json
      `,
      [
        role,
        companyRow?.id ?? null,
        companyRow?.name ?? null,
        JSON.stringify(mergedPermissions),
        id,
      ]
    );

    if (!rows.length) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json({ ok: true, user: rows[0] });
  } catch (err) {
    console.error("[ADMIN_USER_PATCH_ERROR]", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
