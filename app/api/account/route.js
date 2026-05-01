// app/api/account/route.js
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../../lib/nextauth-options";
import { q } from "../../../lib/db";

export async function GET() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { rows } = await q(
      `
      SELECT
        id,
        name,
        email,
        phone,
        company_name,
        monthly_expiring_summary_enabled
      FROM users
      WHERE id = $1
      LIMIT 1
      `,
      [session.user.id]
    );

    if (!rows.length) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json({ user: rows[0] });
  } catch (err) {
    console.error("[GET /api/account] Error:", err);
    return NextResponse.json(
      { error: "Failed to load account." },
      { status: 500 }
    );
  }
}

export async function PATCH(req) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body = {};
  try {
    body = await req.json();
  } catch {
    body = {};
  }

  try {
    const { rows } = await q(
      `
      UPDATE users
      SET
        name = COALESCE($1, name),
        email = COALESCE($2, email),
        phone = COALESCE($3, phone),
        monthly_expiring_summary_enabled = COALESCE($4, monthly_expiring_summary_enabled)
      WHERE id = $5
      RETURNING
        id,
        name,
        email,
        phone,
        company_name,
        monthly_expiring_summary_enabled
      `,
      [
        body.name ?? null,
        body.email ?? null,
        body.phone ?? null,
        typeof body.monthly_expiring_summary_enabled === "boolean"
          ? body.monthly_expiring_summary_enabled
          : null,
        session.user.id,
      ]
    );

    if (!rows.length) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json({ user: rows[0] });
  } catch (err) {
    console.error("[PATCH /api/account] Error:", err);
    return NextResponse.json(
      { error: "Failed to update account." },
      { status: 500 }
    );
  }
}
