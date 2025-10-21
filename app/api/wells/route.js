// app/api/wells/route.js
import { NextResponse } from "next/server";
import { q } from "@/lib/db";

// GET /api/wells  -> list (simple)
export async function GET() {
  try {
    const { rows } = await q(
      `SELECT id, api, company, lease_name, expiration_date, status
       FROM wells
       ORDER BY updated_at DESC
       LIMIT 200`
    );
    return NextResponse.json(rows, { status: 200 });
  } catch (e) {
    console.error("GET /api/wells error:", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

// POST /api/wells  -> create new well
export async function POST(req) {
  try {
    const data = await req.json();

    // Required minimal fields
    const api = (data.api || "").trim();
    const lease_name = (data.lease_name || "").trim();
    if (!api || !lease_name) {
      return NextResponse.json(
        { error: "API and Lease/Well Name are required." },
        { status: 400 }
      );
    }

    // Normalize coordinate strings if present (trim whitespace)
    const anchor1_coords = (data.anchor1_coords || "").trim();
    const anchor2_coords = (data.anchor2_coords || "").trim();
    const anchor3_coords = (data.anchor3_coords || "").trim();
    const anchor4_coords = (data.anchor4_coords || "").trim();

    const result = await q(
      `INSERT INTO wells (
        api, company, company_email, company_phone, company_address,
        company_man_name, company_man_email, company_man_phone,
        lease_name, previous_anchor_work, directions_notes,
        anchor1_coords, anchor2_coords, anchor3_coords, anchor4_coords,
        last_test_date, expiration_date, status, updated_at
      ) VALUES (
        $1,$2,$3,$4,$5,
        $6,$7,$8,
        $9,$10,$11,
        $12,$13,$14,$15,
        $16,$17,$18, now()
      )
      ON CONFLICT (api) DO UPDATE SET
        company = EXCLUDED.company,
        company_email = EXCLUDED.company_email,
        company_phone = EXCLUDED.company_phone,
        company_address = EXCLUDED.company_address,
        company_man_name = EXCLUDED.company_man_name,
        company_man_email = EXCLUDED.company_man_email,
        company_man_phone = EXCLUDED.company_man_phone,
        lease_name = EXCLUDED.lease_name,
        previous_anchor_work = EXCLUDED.previous_anchor_work,
        directions_notes = EXCLUDED.directions_notes,
        anchor1_coords = EXCLUDED.anchor1_coords,
        anchor2_coords = EXCLUDED.anchor2_coords,
        anchor3_coords = EXCLUDED.anchor3_coords,
        anchor4_coords = EXCLUDED.anchor4_coords,
        last_test_date = EXCLUDED.last_test_date,
        expiration_date = EXCLUDED.expiration_date,
        status = EXCLUDED.status,
        updated_at = now()
      RETURNING id, api`,
      [
        api,
        data.company || null,
        data.company_email || null,
        data.company_phone || null,
        data.company_address || null,
        data.company_man_name || null,
        data.company_man_email || null,
        data.company_man_phone || null,
        lease_name || null,
        data.previous_anchor_work || null,
        data.directions_notes || null,
        anchor1_coords || null,
        anchor2_coords || null,
        anchor3_coords || null,
        anchor4_coords || null,
        data.last_test_date || null,
        data.expiration_date || null,
        data.status || "Pending",
      ]
    );

    const created = result.rows[0];
    return NextResponse.json(
      { ok: true, id: created.id, api },
      { status: 201 }
    );
  } catch (e) {
    console.error("POST /api/wells error:", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
