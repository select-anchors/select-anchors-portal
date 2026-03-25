// app/api/jobs/route.js
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../../lib/nextauth-options";
import { q } from "../../../lib/db";

function cleanText(value) {
  const s = String(value ?? "").trim();
  return s || null;
}

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
    status,
    well_api,
    company_name,
    lease_well_name,
    state,
    county,
    job_type,
    priority,
    preferred_date,
    scheduled_date,
    customer_deadline_date,
    requires_811,
    requires_white_flags,
    inside_city_limits,
    apis,
  } = body || {};

  const cleanedApis = Array.isArray(apis)
    ? [...new Set(apis.map((x) => String(x || "").trim()).filter(Boolean))]
    : [];

  const effectiveWellApi = cleanText(well_api);
  const effectiveLeaseWellName = cleanText(lease_well_name);
  const effectiveCompanyName = cleanText(company_name);
  const effectiveState = cleanText(state);
  const effectiveCounty = cleanText(county);
  const effectiveJobType = cleanText(job_type) || "Test existing anchors";
  const effectivePriority = cleanText(priority) || "Normal";
  const effectiveNotes = cleanText(notes);

  const effectiveScheduledDate =
    cleanText(preferred_date) || cleanText(scheduled_date);

  const bulkMode = cleanedApis.length > 0;

  if (
    !bulkMode &&
    !effectiveWellApi &&
    !effectiveLeaseWellName &&
    !effectiveCompanyName
  ) {
    return NextResponse.json(
      {
        error:
          "Please include at least an API, Lease / Well Name, or Company.",
      },
      { status: 400 }
    );
  }

  try {
    let computedTitle = cleanText(title);

    if (!computedTitle) {
      if (bulkMode) {
        computedTitle =
          cleanedApis.length === 1
            ? "Request a Test / Anchor Installation"
            : `Request a Test / Anchor Installation - ${cleanedApis.length} Wells`;
      } else if (effectiveLeaseWellName) {
        computedTitle = `Request a Test / Anchor Installation - ${effectiveLeaseWellName}`;
      } else if (effectiveWellApi) {
        computedTitle = `Request a Test / Anchor Installation - ${effectiveWellApi}`;
      } else {
        computedTitle = "Request a Test / Anchor Installation";
      }
    }

    const requestNotes = bulkMode
      ? [
          effectiveNotes,
          "",
          "Bulk request APIs:",
          ...cleanedApis.map((api) => `- ${api}`),
        ]
          .filter((line, index, arr) => {
            if (line !== "") return true;
            return (
              index > 0 &&
              index < arr.length - 1 &&
              arr[index - 1] !== "" &&
              arr[index + 1] !== ""
            );
          })
          .join("\n")
      : effectiveNotes;

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
        userId,
        computedTitle,
        effectiveScheduledDate,
        userId,
        requestNotes,
        cleanText(status) || "pending",
        bulkMode ? null : effectiveWellApi,
        effectiveCompanyName,
        bulkMode ? null : effectiveLeaseWellName,
        effectiveState,
        effectiveCounty,
        effectiveJobType,
        effectivePriority,
        cleanText(customer_deadline_date),
        !!requires_811,
        !!(requires_white_flags || inside_city_limits),
      ]
    );

    return NextResponse.json({ id: rows[0].id }, { status: 201 });
  } catch (err) {
    console.error("[POST /api/jobs] Error:", err);
    return NextResponse.json(
      { error: "Failed to create job." },
      { status: 500 }
    );
  }
}
