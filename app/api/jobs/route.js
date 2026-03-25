// app/api/jobs/route.js
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../../lib/nextauth-options";
import { q } from "../../../lib/db";

// POST /api/jobs
export async function POST(req) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const role = session.user.role || "customer";

  if (!["customer", "admin", "employee"].includes(role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const userId = session.user.id;

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
    preferred_date,
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
    inside_city_limits,
    apis,
  } = body || {};

  const bulkApis = Array.isArray(apis)
    ? apis.map((v) => String(v || "").trim()).filter(Boolean)
    : [];

  const isBulk = bulkApis.length > 0;

  if (!isBulk && !well_api && !lease_well_name && !company_name) {
    return NextResponse.json(
      { error: "Please include at least an API, Lease / Well Name, or Company." },
      { status: 400 }
    );
  }

  try {
    const computedScheduledDate =
      preferred_date || scheduled_date || null;

    const computedWhiteFlags =
      typeof inside_city_limits === "boolean"
        ? inside_city_limits
        : !!requires_white_flags;

    let computedTitle = title || "";

    if (!computedTitle) {
      if (isBulk) {
        computedTitle = `Request a Test / Anchor Installation - ${bulkApis.length} Wells`;
      } else if (lease_well_name) {
        computedTitle = `Request a Test / Anchor Installation - ${lease_well_name}`;
      } else if (well_api) {
        computedTitle = `Request a Test / Anchor Installation - ${well_api}`;
      } else if (company_name) {
        computedTitle = `Request a Test / Anchor Installation - ${company_name}`;
      } else {
        computedTitle = "Request a Test / Anchor Installation";
      }
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
        requires_white_flags,
        bulk_apis
      )
      VALUES (
        $1, $2, $3, $4, $5,
        $6, $7, $8, $9, $10,
        $11, $12, $13, $14, $15,
        $16, $17
      )
      RETURNING id
      `,
      [
        userId,
        computedTitle,
        computedScheduledDate,
        userId,
        notes || null,
        status || "pending",
        isBulk ? null : well_api || null,
        company_name || null,
        isBulk ? null : lease_well_name || null,
        state || null,
        county || null,
        job_type || "Test existing anchors",
        priority || "Normal",
        customer_deadline_date || null,
        !!requires_811,
        computedWhiteFlags,
        isBulk ? JSON.stringify(bulkApis) : null,
      ]
    );

    return NextResponse.json(
      {
        id: rows[0].id,
        ok: true,
        mode: isBulk ? "bulk" : "single",
      },
      { status: 201 }
    );
  } catch (err) {
    console.error("[POST /api/jobs] Error:", err);
    return NextResponse.json({ error: "Failed to create job." }, { status: 500 });
  }
}
