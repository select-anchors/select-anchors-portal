// app/api/admin/jobs/route.js
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../../../lib/nextauth-options";
import { q } from "../../../../lib/db";

function isUuid(v) {
  return typeof v === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v);
}

async function requireAdmin() {
  const session = await getServerSession(authOptions);
  if (!session || session.user?.role !== "admin") {
    return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }
  return { session };
}

// GET /api/admin/jobs
export async function GET() {
  const gate = await requireAdmin();
  if (gate.error) return gate.error;

  try {
    const { rows } = await q(
      `
      SELECT
        j.id,
        j.title,
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
        j.priority NULLS LAST,
        j.sort_order NULLS LAST,
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
export async function POST(req) {
  const gate = await requireAdmin();
  if (gate.error) return gate.error;

  try {
    const body = await req.json().catch(() => ({}));

    const {
      customer_id,
      title,
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
      sort_order = 0,
      status = "pending",
      notes,
    } = body || {};

    if (!customer_id || !isUuid(customer_id)) {
      return NextResponse.json(
        { error: "customer_id (uuid) is required." },
        { status: 400 }
      );
    }

    if (!job_type) {
      return NextResponse.json({ error: "job_type is required." }, { status: 400 });
    }
    if (!priority) {
      return NextResponse.json({ error: "priority is required." }, { status: 400 });
    }

    const createdBy = gate.session.user.id; // UUID string

    const computedTitle =
      (title && String(title).trim()) ||
      [company_name, lease_well_name, well_api].filter(Boolean).join(" • ") ||
      "Job";

    const driverUuid = driver_user_id ? String(driver_user_id).trim() : null;
    if (driverUuid && !isUuid(driverUuid)) {
      return NextResponse.json({ error: "driver_user_id must be a uuid." }, { status: 400 });
    }

    const { rows } = await q(
      `
      INSERT INTO jobs (
        customer_id,
        title,
        scheduled_date,
        created_by,
        notes,
        status,
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
        driver_user_id,
        sort_order
      )
      VALUES (
        $1,$2,$3,$4,$5,$6,
        $7,$8,$9,$10,$11,$12,$13,$14,
        $15,$16,$17,$18,$19,$20,$21,$22,$23,$24
      )
      RETURNING id
      `,
      [
        customer_id,
        computedTitle,
        scheduled_date || null,
        createdBy,
        notes || null,
        status || "pending",
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
        driverUuid,
        Number(sort_order) || 0,
      ]
    );

    return NextResponse.json({ ok: true, id: rows[0].id }, { status: 201 });
  } catch (err) {
    console.error("[ADMIN/JOBS][POST] Error:", err);
    return NextResponse.json({ error: "Failed to create job." }, { status: 500 });
  }
}
