import { NextResponse } from "next/server";
import { q } from "@/lib/db";

async function ensureCompany(companyPayload) {
  if (!companyPayload?.name) return null;
  const { rows: c0 } = await q(
    "select id from companies where lower(name)=lower($1) limit 1",
    [companyPayload.name]
  );
  if (c0.length) return c0[0].id;

  const { rows: c1 } = await q(
    "insert into companies (name, email, phone, address) values ($1,$2,$3,$4) returning id",
    [companyPayload.name, companyPayload.email || null, companyPayload.phone || null, companyPayload.address || null]
  );
  return c1[0].id;
}

async function upsertAnchors(wellId, anchors) {
  if (!Array.isArray(anchors)) return;
  for (const a of anchors) {
    // update if exists, else insert
    await q(`
      insert into anchors (well_id, quadrant, lat, lng)
      values ($1,$2,$3,$4)
      on conflict (well_id, quadrant)
      do update set lat = excluded.lat, lng = excluded.lng
    `, [wellId, a.quadrant, a.lat, a.lng]);
  }
}

export async function POST(_req, { params }) {
  const { id } = params;

  const { rows: changes } = await q(
    "select * from pending_changes where id=$1 and status='pending'",
    [id]
  );
  if (!changes.length) {
    return NextResponse.json({ error: "Not found or not pending" }, { status: 404 });
  }
  const change = changes[0];
  const payload = change.payload;

  try {
    await q("begin");

    if (payload.kind === "create_well") {
      const companyId = await ensureCompany(payload.well?.company);

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

      await upsertAnchors(well.id, payload.well.anchors);

      await q(
        "insert into well_history (well_id, change_id, snapshot) values ($1,$2,$3)",
        [well.id, change.id, { well, anchors: payload.well.anchors || [] }]
      );

    } else if (payload.kind === "update_well") {
      // identify well either by id or api
      let wellId = payload.well?.id || null;

      if (!wellId && payload.well?.api) {
        const { rows: w0 } = await q("select id from wells where api=$1 limit 1", [payload.well.api]);
        if (w0.length) wellId = w0[0].id;
      }
      if (!wellId) throw new Error("Target well not found");

      const companyId = await ensureCompany(payload.well?.company);

      // fetch current to merge
      const { rows: wcur } = await q("select * from wells where id=$1", [wellId]);
      if (!wcur.length) throw new Error("Well missing");

      const cur = wcur[0];
      const fields = {
        api:                 payload.well.api ?? cur.api,
        company_id:          companyId ?? cur.company_id,
        company_man_name:    payload.well.companyMan?.name ?? cur.company_man_name,
        company_man_number:  payload.well.companyMan?.number ?? cur.company_man_number,
        company_man_email:   payload.well.companyMan?.email ?? cur.company_man_email,
        company_man_cell:    payload.well.companyMan?.cell ?? cur.company_man_cell,
        previous_anchor_company: payload.well.previousAnchorCompany ?? cur.previous_anchor_company,
        last_test_date:      payload.well.lastTestDate ?? cur.last_test_date,
      };

      const { rows: wupd } = await q(
        `update wells set
           api=$2, company_id=$3, company_man_name=$4, company_man_number=$5, company_man_email=$6, company_man_cell=$7,
           previous_anchor_company=$8, last_test_date=$9, updated_at=now()
         where id=$1 returning *`,
        [wellId, fields.api, fields.company_id, fields.company_man_name, fields.company_man_number,
         fields.company_man_email, fields.company_man_cell, fields.previous_anchor_company, fields.last_test_date]
      );

      await upsertAnchors(wellId, payload.well.anchors);

      await q(
        "insert into well_history (well_id, change_id, snapshot) values ($1,$2,$3)",
        [wellId, change.id, { well: wupd[0], anchors: payload.well.anchors || "unchanged" }]
      );

    } else {
      await q(
        `update pending_changes set status='rejected', decided_at=now(), reason='Unsupported kind'
         where id=$1`,
        [id]
      );
      await q("commit");
      return NextResponse.json({ ok: false, note: "Unsupported kind" });
    }

    await q("update pending_changes set status='approved', decided_at=now() where id=$1", [id]);
    await q("commit");
    return NextResponse.json({ ok: true });
  } catch (e) {
    await q("rollback");
    console.error(e);
    return NextResponse.json({ error: e.message || "Failed to approve change" }, { status: 500 });
  }
}
