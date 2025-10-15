// app/api/admin/changes/[id]/approve/route.js
import { NextResponse } from "next/server";
import { q } from "@/lib/db";

export async function POST(_req, { params }) {
  const { id } = params;

  // fetch change
  const { rows: changes } = await q(
    "select * from pending_changes where id=$1 and status='pending'",
    [id]
  );
  if (changes.length === 0) {
    return NextResponse.json({ error: "Not found or not pending" }, { status: 404 });
  }
  const change = changes[0];
  const payload = change.payload;

  // Only implementing create_well for now
  if (payload.kind !== "create_well") {
    await q(`update pending_changes set status='rejected', decided_at=now(), reason='Only create_well supported for now' where id=$1`, [id]);
    return NextResponse.json({ ok: false, note: "Only create_well supported for now" });
  }

  // Apply inside a transaction
  try {
    await q("begin");

    // company (create or reuse by name)
    let companyId = null;
    if (payload.well?.company?.name) {
      const { rows: c0 } = await q(
        "select id from companies where lower(name)=lower($1) limit 1",
        [payload.well.company.name]
      );
      if (c0.length) companyId = c0[0].id;
      else {
        const { rows: c1 } = await q(
          "insert into companies (name,email,phone,address) values ($1,$2,$3,$4) returning id",
          [
            payload.well.company.name,
            payload.well.company.email || null,
            payload.well.company.phone || null,
            payload.well.company.address || null,
          ]
        );
        companyId = c1[0].id;
      }
    }

    // well
    const { rows: w1 } = await q(
      `insert into wells
         (api, company_id, company_man_name, company_man_number, company_man_email, company_man_cell,
          previous_anchor_company, last_test_date)
       values ($1,$2,$3,$4,$5,$6,$7,$8)
       returning *`,
      [
        payload.well.api,
        companyId,
        payload.well.companyMan?.name || null,
        payload.well.companyMan?.number || null,
        payload.well.companyMan?.email || null,
        payload.well.companyMan?.cell || null,
        payload.well.previousAnchorCompany || null,
        payload.well.lastTestDate || null,
      ]
    );
    const well = w1[0];

    // anchors
    if (Array.isArray(payload.well.anchors)) {
      for (const a of payload.well.anchors) {
        await q(
          "insert into anchors (well_id, quadrant, lat, lng) values ($1,$2,$3,$4)",
          [well.id, a.quadrant, a.lat, a.lng]
        );
      }
    }

    // history
    await q(
      "insert into well_history (well_id, change_id, snapshot) values ($1,$2,$3)",
      [well.id, change.id, { well, anchors: payload.well.anchors || [] }]
    );

    // mark approved
    await q(
      "update pending_changes set status='approved', decided_at=now() where id=$1",
      [id]
    );

    await q("commit");
    return NextResponse.json({ ok: true, wellId: well.id });
  } catch (e) {
    await q("rollback");
    console.error(e);
    return NextResponse.json({ error: "Failed to approve change" }, { status: 500 });
  }
}
