import { NextResponse } from "next/server";
import { q } from "@/lib/db";

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status"); // e.g. "pending" or "approved"

    const where = status ? `WHERE status = $1` : "";
    const params = status ? [status] : [];

    const { rows } = await q(
      `
      SELECT id, api, lease_well_name, company, company_man_name, last_test_date,
             previous_anchor_work, directions_notes,
             anchor1_expiration, anchor2_expiration, anchor3_expiration, anchor4_expiration,
             status, approved_by, approved_at, created_at
      FROM wells
      ${where}
      ORDER BY created_at DESC
      `,
      params
    );

    return NextResponse.json(rows, { status: 200 });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const b = await req.json();

    const {
      company, company_email, company_phone, company_address,
      company_man_name, company_man_email, company_man_phone,

      lease_well_name, // NEW
      api,

      previous_anchor_work, // NEW (textarea)
      directions_notes,     // RENAMED (textarea)
      last_test_date,

      anchor1_lat, anchor1_lng, anchor1_expiration,
      anchor2_lat, anchor2_lng, anchor2_expiration,
      anchor3_lat, anchor3_lng, anchor3_expiration,
      anchor4_lat, anchor4_lng, anchor4_expiration,
    } = b || {};

    if (!api || !company) {
      return NextResponse.json({ error: "API and Company are required." }, { status: 400 });
    }

    const sql = `
      INSERT INTO wells (
        company, company_email, company_phone, company_address,
        company_man_name, company_man_email, company_man_phone,
        lease_well_name, api,
        previous_anchor_work, directions_notes, last_test_date,
        anchor1_lat, anchor1_lng, anchor1_expiration,
        anchor2_lat, anchor2_lng, anchor2_expiration,
        anchor3_lat, anchor3_lng, anchor3_expiration,
        anchor4_lat, anchor4_lng, anchor4_expiration,
        status
      )
      VALUES (
        $1,$2,$3,$4,
        $5,$6,$7,
        $8,$9,
        $10,$11,$12,
        $13,$14,$15,
        $16,$17,$18,
        $19,$20,$21,
        $22,$23,$24,
        'pending'
      )
      RETURNING id
    `;

    const params = [
      company, company_email, company_phone, company_address,
      company_man_name, company_man_email, company_man_phone,
      lease_well_name, api,
      previous_anchor_work, directions_notes, last_test_date,
      anchor1_lat, anchor1_lng, anchor1_expiration,
      anchor2_lat, anchor2_lng, anchor2_expiration,
      anchor3_lat, anchor3_lng, anchor3_expiration,
      anchor4_lat, anchor4_lng, anchor4_expiration,
    ];

    const { rows } = await q(sql, params);
    return NextResponse.json({ ok: true, id: rows[0]?.id }, { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
