// app/api/notifications/preview-expiring/route.js
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../../../lib/nextauth-options";
import { q } from "../../../../lib/db";

export async function GET(req) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(req.url);
  const windowDays = Number(url.searchParams.get("windowDays") || 90);
  const companyId = session.user.company_id || null;

  if (!companyId) {
    return NextResponse.json({ count: 0 });
  }

  const { rows } = await q(
    `
    SELECT COUNT(*)::int AS count
    FROM wells
    WHERE company_id = $1
      AND current_expires_at IS NOT NULL
      AND current_expires_at <= CURRENT_DATE + ($2::int * INTERVAL '1 day')
    `,
    [companyId, windowDays]
  );

  return NextResponse.json({ count: rows[0]?.count || 0 });
}
