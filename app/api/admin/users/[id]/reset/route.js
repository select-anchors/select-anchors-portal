// app/api/admin/users/[id]/reset/route.js
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import bcrypt from "bcrypt";
import { authOptions } from "../../../../../../lib/nextauth-options";
import { q } from "../../../../../../lib/db";

async function requireAdmin() {
  const session = await getServerSession(authOptions);

  if (!session || session.user?.role !== "admin") {
    return {
      error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }

  return { session };
}

export async function POST(req, { params }) {
  const gate = await requireAdmin();
  if (gate.error) return gate.error;

  try {
    const id = params.id;
    const body = await req.json().catch(() => ({}));
    const password = String(body.password || "");

    if (!password || password.length < 8) {
      return NextResponse.json(
        { error: "Temporary password must be at least 8 characters." },
        { status: 400 }
      );
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const { rows } = await q(
      `
      UPDATE users
      SET
        password_hash = $1,
        reset_token = NULL,
        reset_token_expires = NULL
      WHERE id = $2
      RETURNING id, email
      `,
      [passwordHash, id]
    );

    if (!rows.length) {
      return NextResponse.json({ error: "User not found." }, { status: 404 });
    }

    return NextResponse.json({
      ok: true,
      message: "Temporary password saved.",
      user: rows[0],
    });
  } catch (err) {
    console.error("[ADMIN_USER_RESET_PASSWORD_ERROR]", err);
    return NextResponse.json(
      { error: "Failed to reset password." },
      { status: 500 }
    );
  }
}
