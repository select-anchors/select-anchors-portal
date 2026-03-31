// app/api/wells/[api]/services/route.js
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../../../../lib/nextauth-options";
import { q } from "../../../../../lib/db";
import { hasPermission } from "../../../../../lib/permissions";
import { randomUUID } from "crypto";

export async function POST(req, { params }) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!hasPermission(session, "can_edit_wells")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const api = decodeURIComponent(params.api);
    const body = await req.json();

    const {
      service_date,
      service_type,
      tested_by_company,
      technician_name,
      notes,
      recommended_action,
      invoice_number,
      anchors
    } = body;

    const wellResult = await q(
      `SELECT id FROM wells WHERE api = $1 LIMIT 1`,
      [api]
    );

    if (!wellResult.rows.length) {
      return NextResponse.json({ error: "Well not found" }, { status: 404 });
    }

    const well_id = wellResult.rows[0].id;
    const service_id = randomUUID();

    await q(
      `
      INSERT INTO well_services (
        id,
        well_id,
        well_api,
        service_date,
        service_type,
        tested_by_company,
        technician_name,
        notes,
        recommended_action,
        invoice_number,
        created_at,
        updated_at
      )
      VALUES (
        $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,NOW(),NOW()
      )
      `,
      [
        service_id,
        well_id,
        api,
        service_date,
        service_type,
        tested_by_company,
        technician_name,
        notes,
        recommended_action,
        invoice_number
      ]
    );

    if (Array.isArray(anchors)) {
      for (const a of anchors) {
        await q(
          `
          INSERT INTO well_service_anchors (
            id,
            well_service_id,
            anchor_position,
            inches_out_of_ground,
            pull_result_lbs,
            pass_fail,
            deactivated,
            replacement_required,
            notes,
            created_at,
            updated_at
          )
          VALUES (
            gen_random_uuid(),
            $1,$2,$3,$4,$5,$6,$7,$8,NOW(),NOW()
          )
          `,
          [
            service_id,
            a.anchor_position,
            a.inches_out_of_ground || null,
            a.pull_result_lbs || null,
            a.pass_fail || null,
            a.deactivated || false,
            a.replacement_required || false,
            a.notes || null
          ]
        );
      }
    }

    return NextResponse.json({ ok: true });

  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
