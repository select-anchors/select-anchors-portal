// app/api/wells/route.js
import { NextResponse } from "next/server";
import { q } from "@/lib/db";

// Ensures table exists so the first GET doesn't crash if migrations weren't run.
async function ensureWellsTable() {
  await q(`
    CREATE TABLE IF NOT EXISTS wells (
      id                BIGSERIAL PRIMARY KEY,
      api               TEXT NOT NULL,
      company           TEXT,
      company_email     TEXT,
      company_phone     TEXT,
      company_address   TEXT,
      company_man_name  TEXT,
      company_man_email TEXT,
      company_man_phone TEXT,
      lease_name        TEXT,
      previous_anchor_work TEXT,
      directions_notes     TEXT,
      anchor1_coords    TEXT,
      anchor2_coords    TEXT,
      anchor3_coords    TEXT,
      anchor4_coords    TEXT,
      last_test_date    DATE,
      expiration_date   DATE,
      status            TEXT DEFAULT 'Pending',
      created_at        TIMESTAMPTZ DEFAULT now(),
      updated_at        TIMESTAMPTZ DEFAULT now()
    );
    CREATE UNIQUE INDEX IF NOT EXISTS wells_api_key ON wells(api);
  `);
}

// GET /api/wells -> list the most recent wells
export async function GET() {
  try {
    await ensureWellsTable();

    const { rows } = await q(
      `SELECT id, api, company, lease_name, expiration_date, status
       FROM wells
       ORDER BY updated_at DESC
       LIMIT 200`
    );

    return NextResponse.json(rows, { status: 200 });
  } catch (e) {
    console.error("GET /api/wells error:", e?.message || e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

// POST /api/wells -> upsert by api
export async function POST(req) {
  try {
    await ensureWellsTable();

    const data = await req.json();

    const api = (data.api || "").trim();
    const lease_name = (data.lease_name || "").trim();
    if (!api || !lease_name) {
      return NextResponse.json(
        { error: "API and Lease/Well Name are required." },
        { status: 400 }
      );
    }

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
        (data.anchor1_coords || "").trim() || null,
        (data.anchor2_coords || "").trim() || null,
        (data.anchor3_coords || "").trim() || null,
        (data.anchor4_coords || "").trim() || null,
        data.last_test_date || null,
        data.expiration_date || null,
        data.status || "Pending",
      ]
    );

    const created = result.rows[0];
    return NextResponse.json({ ok: true, id: created.id, api }, { status: 201 });
  } catch (e) {
    console.error("POST /api/wells error:", e?.message || e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
