// app/api/account/route.js

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/nextauth-options";
import { q } from "@/lib/db";

/**
 * GET /api/account
 * Fetch the currently logged-in user's account info
 */
export async function GET() {
  const session = await getServerSession(authOptions);

  if (!session || !session.user || !session.user.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // IMPORTANT: users.id is UUID → treat as string, not number
  const userId = session.user.id;

  try {
    const { rows } = await q(
      `
      SELECT
        id,
        name,
        email,
        phone,
        company_name
      FROM users
      WHERE id = $1
      LIMIT 1
      `,
      [userId]
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

/**
 * PATCH /api/account
 * Update name / email / phone for the current user
 */
export async function PATCH(req) {
  const session = await getServerSession(authOptions);

  if (!session || !session.user || !session.user.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user.id;

  let body;
  try {
    body = await req.json();
  } catch {
    body = {};
  }

  const { name, email, phone } = body;

  try {
    const { rows } = await q(
      `
      UPDATE users
      SET
        name  = COALESCE($1, name),
        email = COALESCE($2, email),
        phone = COALESCE($3, phone)
      WHERE id = $4
      RETURNING
        id,
        name,
        email,
        phone,
        company_name
      `,
      [name ?? null, email ?? null, phone ?? null, userId]
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
