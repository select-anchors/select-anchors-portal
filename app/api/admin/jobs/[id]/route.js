// /app/api/admin/jobs/[id]/route.js
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

export async function GET(req, { params }) {
  const gate = await requireAdmin();
  if (gate.error) return gate.error;

  const id = Number(params.id);
  if (!id) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

  try {
    const { rows } = await q(
      `SELECT j.*, u.name AS driver_name
       FROM jobs j
       LEFT JOIN users u ON j.driver_user_id = u.id
       WHERE j.id = $1`,
      [id]
    );

    if (!rows.length) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    return NextResponse.json({ job: rows[0] });
  } catch (err) {
    console.error("[ADMIN/JOBS][GET ONE]", err);
    return NextResponse.json({ error: "Failed to load job." }, { status: 500 });
  }
}

export async function PATCH(req, { params }) {
  const gate = await requireAdmin();
  if (gate.error) return gate.error;

  const id = Number(params.id);
  if (!id) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

  try {
    const body = await req.json();

    const fields = [
      "well_api",
      "company_name",
      "lease_well_name",
      "state",
      "county",
      "job_type",
      "priority",
      "customer_deadline_date",
      "requires_811",
      "one_call_state",
      "one_call_number",
      "one_call_submitted_at",
      "safe_to_dig_after",
      "requires_white_flags",
      "select_anchors_installs_flags",
      "mileage_multiplier",
      "scheduled_date",
      "driver_user_id",
      "sort_order",
      "status",
    ];

    const updates = [];
    const values = [];
    let idx = 1;

    for (const f of fields) {
      if (body[f] !== undefined) {
        updates.push(`${f} = $${idx}`);
        values.push(body[f]);
        idx++;
      }
    }

    if (!updates.length) {
      return NextResponse.json({ error: "No fields to update" }, { status: 400 });
    }

    values.push(id);

    await q(
      `UPDATE jobs SET ${updates.join(", ")} WHERE id = $${idx}`,
      values
    );

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[ADMIN/JOBS][PATCH]", err);
    return NextResponse.json({ error: "Failed to update job." }, { status: 500 });
  }
}

export async function DELETE(req, { params }) {
  const gate = await requireAdmin();
  if (gate.error) return gate.error;

  const id = Number(params.id);
  if (!id) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

  try {
    await q(`DELETE FROM jobs WHERE id = $1`, [id]);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[ADMIN/JOBS][DELETE]", err);
    return NextResponse.json({ error: "Failed to delete job." }, { status: 500 });
  }
}
