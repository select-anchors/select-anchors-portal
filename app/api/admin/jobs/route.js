// /app/api/admin/jobs/route.js
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/nextauth-options";
import { q } from "@/lib/db";

async function requireAdmin() {
  const session = await getServerSession(authOptions);
  if (!session || session.user?.role !== "admin") {
    return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }
  return { session };
}

// GET /api/admin/jobs
// Optional filters later (date, driver, status), but for now we'll just return all.
export async function GET(req) {
  const gate = await requireAdmin();
  if (gate.error) return gate.error;

  try {
    // You can add WHERE filters later using URL search params if you want.
    const { rows } = await q(
      `
      SELECT
        j.id,
        j.well_api,
        j.company_name,
        j.lease_well_name,
        j.state,
        j.county,
        j.job_type,
        j.priority,
        j.customer_deadline_date,
        j.requires_811,
        j.one_call_state,
        j.one_call_number,
        j.one_call_submitted_at,
        j.safe_to_dig_after,
        j.requires_white_flags,
        j.select_anchors_installs_flags,
        j.mileage_multiplier,
        j.scheduled_date,
        j.driver_user_id,
        j.sort_order,
        j.status,
        j.created_at,
        u.name AS driver_name
      FROM jobs j
      LEFT JOIN users u ON j.driver_user_id = u.id
      ORDER BY
        j.scheduled_date NULLS LAST,
        j.priority,
        j.sort_order,
        j.created_at DESC
      `
    );

    return NextResponse.json({ jobs: rows });
  } catch (err) {
    console.error("[ADMIN/JOBS][GET] Error:", err);
    return NextResponse.json({ error: "Failed to load jobs." }, { status: 500 });
  }
}

// POST /api/admin/jobs
// Minimal create for now; we can expand as we wire in other stages.
export async function POST(req) {
  const gate = await requireAdmin();
  if (gate.error) return gate.error;

  try {
    const body = await req.json();
    const {
      well_api,
      company_name,
      lease_well_name,
      state,
      county,
      job_type,
      priority,
      customer_deadline_date,
      requires_811 = false,
      one_call_state,
      one_call_number,
      one_call_submitted_at,
      safe_to_dig_after,
      requires_white_flags = false,
      select_anchors_installs_flags = false,
      mileage_multiplier = 1.0,
      scheduled_date,
      driver_user_id,
      status = "pending",
    } = body || {};

    if (!job_type) {
      return NextResponse.json(
        { error: "job_type is required." },
        { status: 400 }
      );
    }

    if (!priority) {
      return NextResponse.json(
        { error: "priority is required." },
        { status: 400 }
      );
    }

    const createdByUserId = gate.session?.user?.id
      ? parseInt(gate.session.user.id, 10)
      : null;

    const { rows } = await q(
      `
      INSERT INTO jobs (
        well_api,
        company_name,
        lease_well_name,
        state,
        county,
        job_type,
        priority,
        customer_deadline_date,
        requires_811,
        one_call_state,
        one_call_number,
        one_call_submitted_at,
        safe_to_dig_after,
        requires_white_flags,
        select_anchors_installs_flags,
        mileage_multiplier,
        scheduled_date,
        driver_user_id,
        sort_order,
        status,
        created_by_user_id
      )
      VALUES (
        $1, $2, $3, $4, $5,
        $6, $7, $8,
        $9, $10, $11, $12, $13,
        $14, $15, $16,
        $17, $18, 0,
        $19, $20
      )
      RETURNING id
      `,
      [
        well_api || null,
        company_name || null,
        lease_well_name || null,
        state || null,
        county || null,
        job_type,
        priority,
        customer_deadline_date || null,
        !!requires_811,
        one_call_state || null,
        one_call_number || null,
        one_call_submitted_at || null,
        safe_to_dig_after || null,
        !!requires_white_flags,
        !!select_anchors_installs_flags,
        Number(mileage_multiplier) || 1.0,
        scheduled_date || null,
        driver_user_id ? Number(driver_user_id) : null,
        status,
        createdByUserId,
      ]
    );

    return NextResponse.json({ ok: true, id: rows[0].id }, { status: 201 });
  } catch (err) {
    console.error("[ADMIN/JOBS][POST] Error:", err);
    return NextResponse.json({ error: "Failed to create job." }, { status: 500 });
  }
}
