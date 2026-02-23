// /app/api/driver/my-day/route.js
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/nextauth-options";
import { q } from "@/lib/db";

export async function GET() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const role = session.user.role;
  const isStaff = role === "admin" || role === "employee";
  if (!isStaff) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const userId = String(session.user.id); // UUID string

  try {
    const { rows } = await q(
      `
      SELECT
        j.id,
        j.scheduled_date AS when,
        j.company_name,
        j.lease_well_name,
        j.well_api AS api,
        j.job_type AS task,
        j.status
      FROM jobs j
      WHERE
        (j.driver_user_id = $1 OR j.driver_user_id IS NULL)
        AND (j.status IS NULL OR j.status NOT IN ('completed','canceled'))
      ORDER BY
        j.scheduled_date NULLS LAST,
        j.sort_order NULLS LAST,
        j.created_at DESC
      LIMIT 200
      `,
      [userId]
    );

    return NextResponse.json({ jobs: rows });
  } catch (err) {
    console.error("[DRIVER/MY-DAY][GET] Error:", err);
    return NextResponse.json({ error: "Failed to load jobs." }, { status: 500 });
  }
}
