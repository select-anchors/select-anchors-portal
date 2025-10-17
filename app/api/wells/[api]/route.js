// app/api/wells/[api]/route.js
import { NextResponse } from "next/server";
import { q } from "@/lib/db";

// GET /api/wells/:api  — single well (including company + notes)
export async function GET(_req, { params }) {
  const { api } = params;

  // Well + company (if linked)
  const wellRes = await q(
    `
    SELECT w.*, c.name AS company_name, c.email AS company_email, c.phone AS company_phone
    FROM wells w
    LEFT JOIN companies c ON c.id = w.company_id
    WHERE w.api = $1
    `,
    [api]
  );

  if (wellRes.rowCount === 0) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json(wellRes.rows[0]);
}

// PATCH /api/wells/:api  — update a well (also used for “approve”)
export async function PATCH(req, { params }) {
  const { api } = params;
  const body = await req.json();

  // Build dynamic update
  const fields = [];
  const values = [];
  let idx = 1;

  for (const [k, v] of Object.entries(body)) {
    fields.push(`${k} = $${idx++}`);
    values.push(v);
  }
  if (!fields.length) return NextResponse.json({ ok: true });

  values.push(api);

  const sql = `UPDATE wells SET ${fields.join(", ")} WHERE api = $${idx} RETURNING *`;
  const upd = await q(sql, values);

  if (upd.rowCount === 0) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json(upd.rows[0]);
}

// DELETE /api/wells/:api  — remove well
export async function DELETE(_req, { params }) {
  const { api } = params;
  await q(`DELETE FROM wells WHERE api = $1`, [api]);
  return NextResponse.json({ ok: true });
}
