import { NextResponse } from "next/server";
import { q } from "../../../../../lib/db";

export async function GET(req, { params }) {
  const { api } = params;

  if (!api) {
    return NextResponse.json(
      { error: "Missing well API" },
      { status: 400 }
    );
  }

  try {
    const { rows } = await q(
      `
      SELECT
        ws.id AS service_id,
        ws.service_date,
        ws.replacement_recommended,
        w.id AS well_id,
        w.company_id,
        COALESCE(c.max_anchor_exposed_inches, 12) AS threshold
      FROM well_services ws
      JOIN wells w ON ws.well_id = w.id
      LEFT JOIN companies c ON w.company_id = c.id
      WHERE w.api = $1
      ORDER BY ws.service_date DESC
      LIMIT 1
      `,
      [api]
    );

    if (!rows.length) {
      return NextResponse.json({
        service: null,
        anchors: [],
      });
    }

    const service = rows[0];

    const anchors = await q(
      `
      SELECT
        anchor_position,
        inches_out_of_ground,
        pass_fail,
        deactivated,
        replacement_required
      FROM well_service_anchors
      WHERE well_service_id = $1
      `,
      [service.service_id]
    );

    return NextResponse.json({
      service,
      anchors: anchors.rows,
    });
  } catch (err) {
    console.error("latest-anchor-status error:", err);

    return NextResponse.json(
      { error: "Failed to load anchor status" },
      { status: 500 }
    );
  }
}
