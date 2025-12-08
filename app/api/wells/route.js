// app/api/wells/route.js
import { NextResponse } from "next/server";
import { q } from "@/lib/db";

// GET /api/wells  -> list wells (minimal fields for table)
export async function GET() {
  try {
    const { rows } = await q(`
      SELECT
        id,
        lease_well_name,
        api,
        wellhead_coords,
        company_name,
        TO_CHAR(last_test_date, 'YYYY-MM-DD') AS last_test_date,
        TO_CHAR(expiration_date, 'YYYY-MM-DD') AS expiration_date,
        status
      FROM wells
      ORDER BY id DESC, lease_well_name ASC
      LIMIT 500
    `);
    return NextResponse.json(rows);
  } catch (err) {
    console.error("GET /api/wells error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

// POST /api/wells -> create (kept simple; approve flow can wrap later)
export async function POST(req) {
  try {
    const body = await req.json();

    const {
      lease_well_name, api, wellhead_coords,
      company_name, company_email, company_phone, company_address,
      company_man_name, company_man_email, company_man_phone,
      anchor1_coords, anchor2_coords, anchor3_coords, anchor4_coords,
      previous_anchor_work, directions_other_notes, previous_anchor_company,
      last_test_date, expiration_date, need_by,
      managed_by_company, status = "pending",
      customer, customer_id
    } = body;

    const { rows } = await q(
      `
      INSERT INTO wells (
        lease_well_name, api, wellhead_coords,
        company_name, company_email, company_phone, company_address,
        company_man_name, company_man_email, company_man_phone,
        anchor1_coords, anchor2_coords, anchor3_coords, anchor4_coords,
        previous_anchor_work, directions_other_notes, previous_anchor_company,
        last_test_date, expiration_date, need_by,
        managed_by_company, status,
        customer, customer_id
      ) VALUES (
        $1,$2,
        $3,$4,$5,$6,
        $7,$8,$9,
        $10,$11,$12,$13,
        $14,$15,$16,
        $17,$18,$19,
        $20,$21,
        $22,$23
      )
      RETURNING id, api
      `,
      [
        lease_well_name, api, wellhead_coords,
        company_name, company_email, company_phone, company_address,
        company_man_name, company_man_email, company_man_phone,
        anchor1_coords, anchor2_coords, anchor3_coords, anchor4_coords,
        previous_anchor_work, directions_other_notes, previous_anchor_company,
        last_test_date, expiration_date, need_by,
        managed_by_company, status,
        customer ?? null, customer_id ?? null
      ]
    );

    return NextResponse.json(rows[0], { status: 201 });
  } catch (err) {
    console.error("POST /api/wells error:", err);
    return NextResponse.json({ error: String(err.message || err) }, { status: 400 });
  }
}
