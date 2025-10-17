// app/api/wells/route.js
import { NextResponse } from "next/server";
import { q } from "@/lib/db";

// GET /api/wells?status=pending|approved
export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");

  let rows;
  if (status) {
    rows = (await q(`SELECT * FROM wells WHERE status = $1 ORDER BY created_at DESC`, [status])).rows;
  } else {
    rows = (await q(`SELECT * FROM wells ORDER BY created_at DESC`)).rows;
  }
  return NextResponse.json(rows);
}

// POST /api/wells — create new (comes in as pending)
export async function POST(req) {
  const b = await req.json();

  const sql = `
    INSERT INTO wells (
      api, status, company, company_email, company_phone, company_address,
      company_man_name, company_man_email, company_man_phone,
      lease_name, last_test_date,
      previous_anchor_work, notes_previous_manager,
      anchor1_lat, anchor1_lng,
      anchor2_lat, anchor2_lng,
      anchor3_lat, anchor3_lng,
      anchor4_lat, anchor4_lng
    )
    VALUES (
      $1,$2,$3,$4,$5,$6,
      $7,$8,$9,
      $10,$11,
      $12,$13,
      $14,$15,$16,$17,$18,$19,$20
    )
    RETURNING *;
  `;

  const vals = [
    b.api,
    b.status || "pending",
    b.company, b.company_email, b.company_phone, b.company_address,
    b.company_man_name, b.company_man_email, b.company_man_phone,
    b.lease_name || null, b.last_test_date || null,
    b.previous_anchor_work || null, b.notes_previous_manager || null,
    b.anchor1_lat || null, b.anchor1_lng || null,
    b.anchor2_lat || null, b.anchor2_lng || null,
    b.anchor3_lat || null, b.anchor3_lng || null,
    b.anchor4_lat || null, b.anchor4_lng || null,
  ];

  const ins = await q(sql, vals);
  return NextResponse.json(ins.rows[0], { status: 201 });
}
