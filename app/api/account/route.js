// /app/api/account/route.js
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/nextauth-options";
import { q } from "@/lib/db";

// GET – current user profile
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = Number(session.user.id);
  if (!userId) {
    return NextResponse.json({ error: "Invalid user id" }, { status: 400 });
  }

  try {
    const { rows } = await q(
      `
        SELECT id, name, email, phone, company_name
        FROM users
        WHERE id = $1
      `,
      [userId]
    );

    if (!rows.length) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json({ user: rows[0] });
  } catch (err) {
    console.error("[ACCOUNT][GET] Error:", err);
    return NextResponse.json(
      { error: "Failed to load account." },
      { status: 500 }
    );
  }
}

// PATCH – update current user (name, email, phone)
export async function PATCH(req) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = Number(session.user.id);
  if (!userId) {
    return NextResponse.json({ error: "Invalid user id" }, { status: 400 });
  }

  try {
    const body = await req.json();
    let { name, email, phone } = body;

    email = (email || "").trim().toLowerCase();

    if (!email) {
      return NextResponse.json(
        { error: "Email is required." },
        { status: 400 }
      );
    }

    // basic shape check
    if (!email.includes("@") || !email.includes(".")) {
      return NextResponse.json(
        { error: "Email format looks invalid." },
        { status: 400 }
      );
    }

    // ensure email unique (except for this user)
    const { rows: existing } = await q(
      `SELECT id FROM users WHERE LOWER(email) = $1 AND id <> $2`,
      [email, userId]
    );
    if (existing.length) {
      return NextResponse.json(
        { error: "Another account already uses that email." },
        { status: 400 }
      );
    }

    await q(
      `
        UPDATE users
        SET name = $1,
            email = $2,
            phone = $3
        WHERE id = $4
      `,
      [name || null, email, phone || null, userId]
    );

    // Note: session still has old email/name until they sign out/in again.
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[ACCOUNT][PATCH] Error:", err);
    return NextResponse.json(
      { error: "Failed to update account." },
      { status: 500 }
    );
  }
}
