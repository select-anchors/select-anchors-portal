// app/api/admin/users/[id]/delete/route.js
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../../../../../lib/nextauth-options";
import { q } from "../../../../../../lib/db";

export async function POST(_req, { params }) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id || session.user.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (params.id === session.user.id) {
    return NextResponse.json(
      { error: "You cannot delete your own account." },
      { status: 400 }
    );
  }

  try {
    const { rows } = await q(
      `
      UPDATE users
      SET
        is_active = FALSE,
        password_hash = NULL
      WHERE id = $1
      RETURNING id, email
      `,
      [params.id]
    );

    if (!rows.length) {
      return NextResponse.json({ error: "User not found." }, { status: 404 });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[ADMIN_USER_DELETE_ERROR]", err);
    return NextResponse.json(
      { error: "Failed to delete user." },
      { status: 500 }
    );
  }
}
