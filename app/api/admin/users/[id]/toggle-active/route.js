// app/api/admin/users/[id]/toggle-active/route.js
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../../../../../lib/nextauth-options";
import { q } from "../../../../../../lib/db";

export async function POST(req, { params }) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id || session.user.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (params.id === session.user.id) {
    return NextResponse.json(
      { error: "You cannot deactivate your own account." },
      { status: 400 }
    );
  }

  try {
    const body = await req.json().catch(() => ({}));
    const isActive = !!body.is_active;

    const { rows } = await q(
      `
      UPDATE users
      SET is_active = $1
      WHERE id = $2
      RETURNING id, email, is_active
      `,
      [isActive, params.id]
    );

    if (!rows.length) {
      return NextResponse.json({ error: "User not found." }, { status: 404 });
    }

    return NextResponse.json({ ok: true, user: rows[0] });
  } catch (err) {
    console.error("[ADMIN_USER_TOGGLE_ACTIVE_ERROR]", err);
    return NextResponse.json(
      { error: "Failed to update user status." },
      { status: 500 }
    );
  }
}
