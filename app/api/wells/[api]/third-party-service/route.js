// app/api/wells/[api]/third-party-service/route.js
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../../../../lib/nextauth-options";
import { q } from "../../../../../lib/db";
import { hasPermission } from "../../../../../lib/permissions";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function emptyToNull(v) {
  if (v === "" || v === undefined) return null;
  return v;
}

function canSubmit(session) {
  return (
    hasPermission(session, "can_edit_wells") ||
    hasPermission(session, "can_submit_third_party_services") ||
    hasPermission(session, "can_edit_company_contacts")
  );
}

export async function POST(req, { params }) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!canSubmit(session)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const api = decodeURIComponent(params.api);

  try {
    const body = await req.json();

    const {
      service_date,
      service_type,
      third_party_company_name,
      current_expires_at,
      chart_recorder_file_url,
      jsa_file_url,
      one_call_file_url,
      notes,
      responsibility_acknowledged,
    } = body || {};

    if (!service_date) {
      return NextResponse.json({ error: "Service date is required." }, { status: 400 });
    }

    if (!current_expires_at) {
      return NextResponse.json({ error: "Expiration date is required." }, { status: 400 });
    }

    if (!third_party_company_name) {
      return NextResponse.json({ error: "Third-party company name is required." }, { status: 400 });
    }

    if (!responsibility_acknowledged) {
      return NextResponse.json(
        { error: "Responsibility acknowledgment is required." },
        { status: 400 }
      );
    }

    if (!["third_party_test", "third_party_install_test"].includes(service_type)) {
      return NextResponse.json({ error: "Invalid service type." }, { status: 400 });
    }

    const { rows: wellRows } = await q(
      `
      SELECT id, api, company_id, company_name, lease_well_name
      FROM wells
      WHERE api = $1
      LIMIT 1
      `,
      [api]
    );

    if (!wellRows.length) {
      return NextResponse.json({ error: "Well not found." }, { status: 404 });
    }

    const well = wellRows[0];

    await q(
      `
      INSERT INTO pending_changes (
        kind,
        submitted_by,
        status,
        payload,
        created_at
      )
      VALUES ($1, $2, 'pending', $3::jsonb, NOW())
      `,
      [
        "third_party_service_request",
        session.user.id,
        JSON.stringify({
          api: well.api,
          well_id: well.id,
          lease_well_name: well.lease_well_name,
          company_id: well.company_id,
          company_name: well.company_name,
          requested_by_user_id: session.user.id,
          requested_by_name: session.user.name || "",
          requested_by_email: session.user.email || "",
          requested_by_role: session.user.role || "",
          third_party_service: {
            service_date,
            service_type,
            third_party_company_name,
            current_expires_at,
            chart_recorder_file_url: emptyToNull(chart_recorder_file_url),
            jsa_file_url: emptyToNull(jsa_file_url),
            one_call_file_url: emptyToNull(one_call_file_url),
            notes: emptyToNull(notes),
            responsibility_acknowledged: true,
            responsibility_acknowledged_at: new Date().toISOString(),
          },
        }),
      ]
    );

    return NextResponse.json({
      ok: true,
      message: "Third-party service submitted for review.",
    });
  } catch (err) {
    console.error("[THIRD_PARTY_SERVICE_POST_ERROR]", err);
    return NextResponse.json(
      { error: err?.message || "Failed to submit third-party service." },
      { status: 500 }
    );
  }
}
