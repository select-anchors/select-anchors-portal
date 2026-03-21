// app/api/admin/changes/route.js
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../../../lib/nextauth-options";
import { q } from "../../../../lib/db";
import { hasPermission } from "../../../../lib/permissions";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!hasPermission(session, "can_approve_changes")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const { rows } = await q(
      `
      SELECT
        id,
        kind,
        submitted_by,
        status,
        payload,
        created_at
      FROM pending_changes
      WHERE status = 'pending'
      ORDER BY created_at ASC
      `
    );

    return NextResponse.json({ changes: rows });
  } catch (err) {
    console.error("[ADMIN_CHANGES_GET_ERROR]", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
