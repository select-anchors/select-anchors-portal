// app/api/wells/[api]/services/route.js
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../../../../lib/nextauth-options";
import { q } from "../../../../../lib/db";
import { hasPermission } from "../../../../../lib/permissions";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function noStoreJson(data, init = {}) {
  const res = NextResponse.json(data, init);
  res.headers.set(
    "Cache-Control",
    "no-store, no-cache, must-revalidate, proxy-revalidate"
  );
  res.headers.set("Pragma", "no-cache");
  res.headers.set("Expires", "0");
  return res;
}

function emptyToNull(v) {
  if (v === "" || v === undefined) return null;
  return v;
}

function normalizeBool(v) {
  return !!v;
}

function normalizeAnchorPosition(value) {
  const v = String(value || "").trim().toUpperCase();
  if (["NW", "NE", "SE", "SW"].includes(v)) return v;
  return null;
}

export async function POST(req, { params }) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return noStoreJson({ error: "Unauthorized" }, { status: 401 });
  }

  const canEditWells = hasPermission(session, "can_edit_wells");
  if (!canEditWells) {
    return noStoreJson({ error: "Forbidden" }, { status: 403 });
  }

  const api = decodeURIComponent(params.api);

  try {
    const body = await req.json();

    const {
      service_date,
      service_type,
      tested_by_company,
      technician_name,
      notes,
      recommended_action,
      invoice_number,
      chart_recorder_file_url,
      jsa_file_url,
      invoice_file_url,
      anchors = [],
    } = body || {};

    if (!service_date) {
      return noStoreJson({ error: "Service date is required." }, { status: 400 });
    }

    if (!["test", "install_test"].includes(service_type)) {
      return noStoreJson(
        { error: "Service type must be test or install_test." },
        { status: 400 }
      );
    }

    const { rows: wellRows } = await q(
      `
      SELECT id, api
      FROM wells
      WHERE api = $1
      LIMIT 1
      `,
      [api]
    );

    if (!wellRows.length) {
      return noStoreJson({ error: "Well not found." }, { status: 404 });
    }

    const well = wellRows[0];

    const cleanAnchors = Array.isArray(anchors)
      ? anchors
          .map((a) => {
            const anchor_position = normalizeAnchorPosition(a?.anchor_position);
            if (!anchor_position) return null;

            return {
              anchor_position,
              pull_tested: normalizeBool(a?.pull_tested),
              inches_out_of_ground: emptyToNull(a?.inches_out_of_ground),
              pull_result_lbs: emptyToNull(a?.pull_result_lbs),
              pass_fail: emptyToNull(a?.pass_fail),
              deactivated: normalizeBool(a?.deactivated),
              replacement_required: normalizeBool(a?.replacement_required),
              notes: emptyToNull(a?.notes),

              replacement_installed: normalizeBool(a?.replacement_installed),
              replacement_lat: emptyToNull(a?.replacement_lat),
              replacement_lng: emptyToNull(a?.replacement_lng),
              replacement_notes: emptyToNull(a?.replacement_notes),
            };
          })
          .filter(Boolean)
      : [];

    const replacementRecommended = cleanAnchors.some(
      (a) => a.replacement_required
    );
    const deactivatedAny = cleanAnchors.some((a) => a.deactivated);

    await q("BEGIN");

    const serviceInsert = await q(
      `
      INSERT INTO well_services (
        well_id,
        well_api,
        service_date,
        service_type,
        tested_by_company,
        technician_name,
        notes,
        recommended_action,
        replacement_recommended,
        deactivated_any,
        invoice_number,
        chart_recorder_file_url,
        jsa_file_url,
        invoice_file_url,
        created_at,
        updated_at
      )
      VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, NOW(), NOW()
      )
      RETURNING id
      `,
      [
        well.id,
        well.api,
        service_date,
        service_type,
        emptyToNull(tested_by_company),
        emptyToNull(technician_name),
        emptyToNull(notes),
        emptyToNull(recommended_action),
        replacementRecommended,
        deactivatedAny,
        emptyToNull(invoice_number),
        emptyToNull(chart_recorder_file_url),
        emptyToNull(jsa_file_url),
        emptyToNull(invoice_file_url),
      ]
    );

    const wellServiceId = serviceInsert.rows[0].id;

    for (const anchor of cleanAnchors) {
      await q(
        `
        INSERT INTO well_service_anchors (
          well_service_id,
          anchor_position,
          inches_out_of_ground,
          pull_result_lbs,
          pass_fail,
          deactivated,
          replacement_required,
          notes,
          created_at,
          updated_at
        )
        VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW()
        )
        `,
        [
          wellServiceId,
          anchor.anchor_position,
          anchor.inches_out_of_ground,
          anchor.pull_tested ? anchor.pull_result_lbs : null,
          anchor.pull_tested ? emptyToNull(anchor.pass_fail) : null,
          anchor.deactivated,
          anchor.replacement_required,
          anchor.notes,
        ]
      );

      if (anchor.replacement_installed) {
        const { rows: existingAnchorRows } = await q(
          `
          SELECT id
          FROM anchors
          WHERE well_id = $1
            AND quadrant = $2
          LIMIT 1
          `,
          [well.id, anchor.anchor_position]
        );

        if (existingAnchorRows.length) {
          await q(
            `
            UPDATE anchors
            SET
              lat = COALESCE($1, lat),
              lng = COALESCE($2, lng)
            WHERE id = $3
            `,
            [
              anchor.replacement_lat !== null ? Number(anchor.replacement_lat) : null,
              anchor.replacement_lng !== null ? Number(anchor.replacement_lng) : null,
              existingAnchorRows[0].id,
            ]
          );
        } else {
          await q(
            `
            INSERT INTO anchors (
              id,
              well_id,
              quadrant,
              lat,
              lng
            )
            VALUES (
              gen_random_uuid(), $1, $2, $3, $4
            )
            `,
            [
              well.id,
              anchor.anchor_position,
              anchor.replacement_lat !== null ? Number(anchor.replacement_lat) : null,
              anchor.replacement_lng !== null ? Number(anchor.replacement_lng) : null,
            ]
          );
        }
      }
    }

    await q(
      `
      UPDATE wells
      SET
        current_tested_at = $1,
        updated_at = NOW()
      WHERE id = $2
      `,
      [service_date, well.id]
    );

    await q("COMMIT");

    return noStoreJson({ ok: true, well_service_id: wellServiceId });
  } catch (err) {
    await q("ROLLBACK");
    console.error("POST /api/wells/[api]/services error:", err);
    return noStoreJson(
      { error: String(err?.message || err) },
      { status: 500 }
    );
  }
}
