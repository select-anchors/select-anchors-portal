// app/api/admin/changes/[id]/reject/route.js
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../../../../../lib/nextauth-options";
import { q } from "../../../../../../lib/db";
import { hasPermission } from "../../../../../../lib/permissions";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function POST(req, { params }) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!hasPermission(session, "can_approve_changes")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = params;
  const { reason } = await req.json().catch(() => ({}));

  try {
    await q(
      `
      UPDATE pending_changes
      SET
        status = 'rejected',
        decided_at = NOW(),
        reason = $2
      WHERE id = $1
        AND status = 'pending'
      `,
      [id, reason || null]
    );

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[ADMIN_CHANGE_REJECT_ERROR]", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
