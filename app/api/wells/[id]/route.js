import { NextResponse } from "next/server";
import { q } from "@/lib/db";

/**
 * NOTE: For now this trusts the caller.
 * When auth is added, check req.headers (or session) for role=admin
 * before allowing PUT/DELETE.
 */

export async function GET(_req, { params }) {
  try {
    const { id } = params;
    const { rows } = await q(`SELECT * FROM wells WHERE id = $1`, [id]);
    if (!rows[0]) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(rows[0], { status: 200 });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function PUT(req, { params }) {
  try {
    const { id } = params;
    const data = await req.json();

    // Allow updating any field we created earlier:
    const allowed = [
      "company","company_email","company_phone","company_address",
      "company_man_name","company_man_email","company_man_phone",
      "lease_well_name","api","previous_anchor_work","directions_notes","last_test_date",
      "anchor1_lat","anchor1_lng","anchor1_expiration",
      "anchor2_lat","anchor2_lng","anchor2_expiration",
      "anchor3_lat","anchor3_lng","anchor3_expiration",
      "anchor4_lat","anchor4_lng","anchor4_expiration",
      "status","approved_by","approved_at"
    ];

    const sets = [];
    const vals = [];
    let i = 1;

    for (const k of allowed) {
      if (Object.prototype.hasOwnProperty.call(data, k)) {
        sets.push(`${k} = $${i++}`);
        vals.push(data[k]);
      }
    }

    if (!sets.length) {
      return NextResponse.json({ error: "No fields to update" }, { status: 400 });
    }

    vals.push(id);
    const { rows } = await q(
      `UPDATE wells SET ${sets.join(", ")} WHERE id = $${i} RETURNING *`,
      vals
    );

    return NextResponse.json(rows[0], { status: 200 });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function DELETE(_req, { params }) {
  try {
    const { id } = params;
    await q(`DELETE FROM wells WHERE id = $1`, [id]);
    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
