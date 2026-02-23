// app/api/driver/my-day/route.js
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

  const driverId = String(session.user.id); // UUID

  try {
    // “My Day” = jobs assigned to this driver that aren’t done/canceled/failed
    const { rows } = await q(
      `
      SELECT
        j.id,
        j.scheduled_date,
        j.company_name,
        j.lease_well_name,
        j.well_api,
        j.job_type,
        j.priority,
        j.status
      FROM jobs j
      WHERE j.driver_user_id = $1
        AND (j.status IS NULL OR j.status NOT IN ('completed','canceled','failed'))
      ORDER BY
        j.scheduled_date NULLS LAST,
        j.sort_order NULLS LAST,
        j.created_at DESC
      LIMIT 200
      `,
      [driverId]
    );

    const jobs = rows.map((r) => ({
      id: r.id,
      when: r.scheduled_date ? String(r.scheduled_date) : null,
      company_name: r.company_name,
      lease_well_name: r.lease_well_name,
      api: r.well_api,
      task: r.job_type,
      status: r.status,
      priority: r.priority,
    }));

    return NextResponse.json({ jobs });
  } catch (err) {
    console.error("[DRIVER/MY-DAY][GET] Error:", err);
    return NextResponse.json({ error: "Failed to load jobs." }, { status: 500 });
  }
}
