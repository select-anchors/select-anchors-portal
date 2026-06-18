// app/api/admin/work-entry/route.js

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../../../lib/nextauth-options";
import { q } from "../../../../lib/db";
import { hasPermission } from "../../../../lib/permissions";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function noStoreJson(data, init = {}) {
  const res = NextResponse.json(data, init);
  res.headers.set("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
  res.headers.set("Pragma", "no-cache");
  res.headers.set("Expires", "0");
  return res;
}

function cleanText(v) {
  const s = String(v ?? "").trim();
  return s ? s : null;
}

function normalizeApi(v) {
  return String(v ?? "").trim();
}

function normalizeNumber(v) {
  if (v === "" || v === null || v === undefined) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function addYears(dateStr, years = 2) {
  if (!dateStr) return null;
  const d = new Date(`${dateStr}T00:00:00`);
  if (Number.isNaN(d.getTime())) return null;
  d.setFullYear(d.getFullYear() + years);
  return d.toISOString().slice(0, 10);
}

function makeCoords(lat, lng) {
  const latitude = normalizeNumber(lat);
  const longitude = normalizeNumber(lng);

  if (latitude === null || longitude === null) return null;

  return `${latitude}, ${longitude}`;
}

function normalizePassFail(v) {
  const s = String(v || "not_tested").trim().toLowerCase();
  if (["pass", "fail", "not_tested"].includes(s)) return s;
  return "not_tested";
}

function normalizeServiceType(v) {
  const s = String(v || "test").trim().toLowerCase();
  if (["test", "install_test", "install"].includes(s)) return s;
  return "test";
}

function normalizeCompanyName(name) {
  return String(name || "").trim().replace(/\s+/g, " ");
}

async function getOrCreateCompany(companyName) {
  const cleanName = normalizeCompanyName(companyName);
  if (!cleanName) return null;

  const normalized = cleanName.toLowerCase();

  const existing = await q(
    `
    SELECT id, name
    FROM companies
    WHERE normalized_name = $1
       OR LOWER(name) = $1
    LIMIT 1
    `,
    [normalized]
  );

  if (existing.rows[0]) return existing.rows[0];

  const inserted = await q(
    `
    INSERT INTO companies (
      name,
      normalized_name,
      permissions_json
    )
    VALUES ($1, $2, '{}'::jsonb)
    RETURNING id, name
    `,
    [cleanName, normalized]
  );

  return inserted.rows[0];
}

export async function POST(req) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return noStoreJson({ error: "Unauthorized" }, { status: 401 });
  }

  const canUse =
    session.user.role === "admin" ||
    hasPermission(session, "can_edit_wells") ||
    hasPermission(session, "can_view_all_wells");

  if (!canUse) {
    return noStoreJson({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const body = await req.json();

    const serviceDate = cleanText(body.service_date);
    const expiresAt = cleanText(body.current_expires_at) || addYears(serviceDate, 2);
    const serviceType = normalizeServiceType(body.service_type);
    const wells = Array.isArray(body.wells) ? body.wells : [];

    if (!serviceDate) {
      return noStoreJson({ error: "Service date is required." }, { status: 400 });
    }

    if (!wells.length) {
      return noStoreJson({ error: "At least one well is required." }, { status: 400 });
    }

    const companyName = cleanText(body.company_name);
    const company = await getOrCreateCompany(companyName);

    let createdWells = 0;
    let updatedWells = 0;
    let servicesCreated = 0;
    let anchorRowsCreated = 0;

    await q("BEGIN");

    for (const rawWell of wells) {
      const api = normalizeApi(rawWell.api);

      if (!api) {
        throw new Error("Every well must have an API.");
      }

      const latitude = normalizeNumber(rawWell.latitude);
      const longitude = normalizeNumber(rawWell.longitude);
      const wellheadCoords = makeCoords(rawWell.latitude, rawWell.longitude);

      const existing = await q(
        `
        SELECT id, api
        FROM wells
        WHERE api = $1
        LIMIT 1
        `,
        [api]
      );

      let wellId;

      if (existing.rows.length) {
        wellId = existing.rows[0].id;
        updatedWells += 1;

        await q(
          `
          UPDATE wells
          SET
            customer = COALESCE($1, customer),
            company_name = COALESCE($2, company_name),
            company_email = COALESCE($3, company_email),
            company_phone = COALESCE($4, company_phone),
            company_address = COALESCE($5, company_address),
            company_man_name = COALESCE($6, company_man_name),
            company_man_email = COALESCE($7, company_man_email),
            company_man_phone = COALESCE($8, company_man_phone),
            county = COALESCE($9, county),
            state = COALESCE($10, state),
            lease_well_name = COALESCE($11, lease_well_name),
            previous_anchor_company = COALESCE($12, previous_anchor_company),
            previous_anchor_work = COALESCE($13, previous_anchor_work),
            directions_other_notes = COALESCE($14, directions_other_notes),
            wellhead_coords = COALESCE($15, wellhead_coords),
            latitude = COALESCE($16, latitude),
            longitude = COALESCE($17, longitude),
            company_id = COALESCE($18, company_id),
            current_tested_at = $19,
            current_expires_at = $20,
            status = 'Active',
            updated_at = NOW()
          WHERE id = $21
          `,
          [
            companyName,
            companyName,
            cleanText(body.company_email),
            cleanText(body.company_phone),
            cleanText(body.company_address),
            cleanText(body.company_man_name),
            cleanText(body.company_man_email),
            cleanText(body.company_man_phone),
            cleanText(rawWell.county),
            cleanText(rawWell.state) || "NM",
            cleanText(rawWell.lease_well_name),
            cleanText(rawWell.previous_anchor_company),
            cleanText(rawWell.previous_anchor_work),
            cleanText(rawWell.directions_other_notes),
            wellheadCoords,
            latitude,
            longitude,
            company?.id || null,
            serviceDate,
            expiresAt,
            wellId,
          ]
        );
      } else {
        const inserted = await q(
          `
          INSERT INTO wells (
            api,
            customer,
            company_name,
            company_email,
            company_phone,
            company_address,
            company_man_name,
            company_man_email,
            company_man_phone,
            county,
            state,
            lease_well_name,
            previous_anchor_company,
            previous_anchor_work,
            directions_other_notes,
            wellhead_coords,
            latitude,
            longitude,
            company_id,
            current_tested_at,
            current_expires_at,
            status,
            is_approved,
            approved_at,
            approved_by,
            created_at,
            updated_at
          )
          VALUES (
            $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,
            'Active',
            TRUE,
            NOW(),
            $22,
            NOW(),
            NOW()
          )
          RETURNING id
          `,
          [
            api,
            companyName,
            companyName,
            cleanText(body.company_email),
            cleanText(body.company_phone),
            cleanText(body.company_address),
            cleanText(body.company_man_name),
            cleanText(body.company_man_email),
            cleanText(body.company_man_phone),
            cleanText(rawWell.county),
            cleanText(rawWell.state) || "NM",
            cleanText(rawWell.lease_well_name),
            cleanText(rawWell.previous_anchor_company),
            cleanText(rawWell.previous_anchor_work),
            cleanText(rawWell.directions_other_notes),
            wellheadCoords,
            latitude,
            longitude,
            company?.id || null,
            serviceDate,
            expiresAt,
            session.user.email || session.user.name || "Admin",
          ]
        );

        wellId = inserted.rows[0].id;
        createdWells += 1;
      }

      const testInsert = await q(
        `
        INSERT INTO well_tests (
          well_api,
          tested_at,
          expires_at,
          tested_by_company,
          tested_by_user_id,
          notes,
          created_at,
          updated_at
        )
        VALUES ($1,$2,$3,$4,$5,$6,NOW(),NOW())
        RETURNING id
        `,
        [
          api,
          serviceDate,
          expiresAt,
          cleanText(body.tested_by_company) || "Select Anchors",
          session.user.id,
          cleanText(body.notes),
        ]
      );

      const testId = testInsert.rows[0]?.id || null;

      if (testId) {
        await q(
          `
          UPDATE wells
          SET current_test_id = $1
          WHERE id = $2
          `,
          [testId, wellId]
        );
      }

      const hasRedBagged = (rawWell.anchors || []).some((a) => !!a.red_bagged);
      const hasNeedsNewAnchor = (rawWell.anchors || []).some(
        (a) => !!a.needs_new_anchor
      );

      const serviceInsert = await q(
        `
        INSERT INTO well_services (
          well_id,
          well_api,
          service_date,
          service_type,
          service_provider_type,
          tested_by_company,
          technician_name,
          notes,
          recommended_action,
          replacement_recommended,
          deactivated_any,
          review_status,
          tested_by_user_id,
          created_at,
          updated_at
        )
        VALUES ($1,$2,$3,$4,'select_anchors',$5,$6,$7,$8,$9,$10,'approved',$11,NOW(),NOW())
        RETURNING id
        `,
        [
          wellId,
          api,
          serviceDate,
          serviceType === "install" ? "install_test" : serviceType,
          cleanText(body.tested_by_company) || "Select Anchors",
          cleanText(body.technician_name),
          cleanText(body.notes),
          hasRedBagged || hasNeedsNewAnchor
            ? "Anchor red bagged / new anchor install may be needed."
            : null,
          hasNeedsNewAnchor,
          hasRedBagged,
          session.user.id,
        ]
      );

      const serviceId = serviceInsert.rows[0].id;
      servicesCreated += 1;

      const anchors = Array.isArray(rawWell.anchors) ? rawWell.anchors : [];

      for (const anchor of anchors) {
        const position = cleanText(anchor.anchor_position);
        if (!["NW", "NE", "SE", "SW"].includes(position)) continue;

        const redBagged = !!anchor.red_bagged;
        const needsNewAnchor = !!anchor.needs_new_anchor || redBagged;

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
          VALUES ($1,$2,$3,$4,$5,$6,$7,$8,NOW(),NOW())
          `,
          [
            serviceId,
            position,
            normalizeNumber(anchor.inches_out_of_ground),
            normalizeNumber(anchor.pull_result_lbs),
            redBagged ? "fail" : normalizePassFail(anchor.pass_fail),
            redBagged,
            needsNewAnchor,
            cleanText(anchor.notes),
          ]
        );

        anchorRowsCreated += 1;
      }
    }

    await q("COMMIT");

    return noStoreJson({
      ok: true,
      createdWells,
      updatedWells,
      servicesCreated,
      anchorRowsCreated,
    });
  } catch (err) {
    await q("ROLLBACK").catch(() => {});
    console.error("[ADMIN_WORK_ENTRY_ERROR]", err);
    return noStoreJson(
      { error: err?.message || "Failed to save work entry." },
      { status: 500 }
    );
  }
}
