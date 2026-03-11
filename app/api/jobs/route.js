// app/api/jobs/route.js
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../../lib/nextauth-options";
import { q } from "../../../lib/db";

// POST /api/jobs  (customer creates a job request)
export async function POST(req) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const role = session.user.role || "customer";
  // Allow staff too (useful for testing)
  if (!["customer", "admin", "employee"].includes(role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const userId = session.user.id; // UUID string

  let body = {};
  try {
    body = await req.json();
  } catch {
    body = {};
  }

  const {
    title,
    notes,
    scheduled_date,
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
    requires_white_flags,
  } = body || {};

  // Basic validation for demo quality
  if (!well_api && !lease_well_name && !company_name) {
    return NextResponse.json(
      { error: "Please include at least an API, Lease/Well Name, or Company." },
      { status: 400 }
    );
  }

  try {
    const computedTitle =
      title ||
      (lease_well_name ? `Test request – ${lease_well_name}` : "Anchor Test Request");

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
        requires_white_flags
      )
      VALUES (
        $1, $2, $3, $4, $5,
        $6, $7, $8, $9, $10,
        $11, $12, $13, $14, $15,
        $16
      )
      RETURNING id
      `,
      [
        userId, // customer_id
        computedTitle,
        scheduled_date || null,
        userId, // created_by
        notes || null,
        status || "pending",
        well_api || null,
        company_name || null,
        lease_well_name || null,
        state || null,
        county || null,
        job_type || "test_existing",
        priority || "normal",
        customer_deadline_date || null,
        !!requires_811,
        !!requires_white_flags,
      ]
    );

    return NextResponse.json({ id: rows[0].id }, { status: 201 });
  } catch (err) {
    console.error("[POST /api/jobs] Error:", err);
    return NextResponse.json({ error: "Failed to create job." }, { status: 500 });
  }
}
