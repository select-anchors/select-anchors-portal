// app/api/wells/[api]/route.js
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

function emptyToNullDate(v) {
  if (v === "" || v === undefined) return null;
  return v;
}

function emptyToNullText(v) {
  if (v === "" || v === undefined) return null;
  return v;
}

async function loadWellByApi(api) {
  const { rows } = await q(
    `
    SELECT
      w.id,
      w.api,
      w.company_id,
      w.lease_well_name,
      w.company_name,
      w.company_email,
      w.company_phone,
      w.company_address,
      w.company_man_name,
      w.company_man_email,
      w.company_man_phone,
      w.previous_anchor_company,
      w.previous_anchor_work,
      w.directions_other_notes,
      w.wellhead_coords,
      w.state,
      w.county,
      w.status,
      w.customer,
      w.customer_id,
      TO_CHAR(COALESCE(w.current_tested_at, t.tested_at), 'YYYY-MM-DD') AS current_tested_at,
      TO_CHAR(COALESCE(w.current_expires_at, t.expires_at), 'YYYY-MM-DD') AS current_expires_at,
      w.current_test_id
    FROM wells w
    LEFT JOIN well_tests t ON t.id = w.current_test_id
    WHERE w.api = $1
    LIMIT 1
    `,
    [api]
  );

  return rows?.[0] ?? null;
}

function buildDiff(existing, incoming, allowedFields) {
  const diff = {};

  for (const field of allowedFields) {
    if (!(field in incoming)) continue;

    const nextValue =
      field === "current_tested_at" || field === "current_expires_at"
        ? emptyToNullDate(incoming[field])
        : emptyToNullText(incoming[field]);

    const currentValue =
      field === "current_tested_at" || field === "current_expires_at"
        ? emptyToNullDate(existing[field])
        : emptyToNullText(existing[field]);

    if (nextValue !== currentValue) {
      diff[field] = nextValue;
    }
  }

  return diff;
}

async function applyWellUpdate(api, changes, canAssignCustomer) {
  const {
    lease_well_name,
    company_name,
    company_email,
    company_phone,
    company_address,
    company_man_name,
    company_man_email,
    company_man_phone,
    previous_anchor_company,
    previous_anchor_work,
    directions_other_notes,
    status,
    state,
    county,
    wellhead_coords,
    customer,
    customer_id,
    current_tested_at,
    current_expires_at,
  } = changes;

  const testedAt = emptyToNullDate(current_tested_at);
  const expiresAt = emptyToNullDate(current_expires_at);
  const shouldWriteTest =
    current_tested_at !== undefined || current_expires_at !== undefined;

  const updatedWell = await q(
    `
    UPDATE wells
    SET
      lease_well_name         = COALESCE($1, lease_well_name),
      company_name            = COALESCE($2, company_name),
      company_email           = COALESCE($3, company_email),
      company_phone           = COALESCE($4, company_phone),
      company_address         = COALESCE($5, company_address),
      company_man_name        = COALESCE($6, company_man_name),
      company_man_email       = COALESCE($7, company_man_email),
      company_man_phone       = COALESCE($8, company_man_phone),
      previous_anchor_company = COALESCE($9, previous_anchor_company),
      previous_anchor_work    = COALESCE($10, previous_anchor_work),
      directions_other_notes  = COALESCE($11, directions_other_notes),
      status                  = COALESCE($12, status),
      state                   = COALESCE($13, state),
      county                  = COALESCE($14, county),
      wellhead_coords         = COALESCE($15, wellhead_coords),
      customer                = CASE WHEN $16 THEN COALESCE($17, customer) ELSE customer END,
      customer_id             = CASE WHEN $16 THEN COALESCE($18, customer_id) ELSE customer_id END,
      updated_at              = NOW()
    WHERE api = $19
    RETURNING id, api, current_test_id
    `,
    [
      emptyToNullText(lease_well_name),
      emptyToNullText(company_name),
      emptyToNullText(company_email),
      emptyToNullText(company_phone),
      emptyToNullText(company_address),
      emptyToNullText(company_man_name),
      emptyToNullText(company_man_email),
      emptyToNullText(company_man_phone),
      emptyToNullText(previous_anchor_company),
      emptyToNullText(previous_anchor_work),
      emptyToNullText(directions_other_notes),
      emptyToNullText(status),
      emptyToNullText(state),
      emptyToNullText(county),
      emptyToNullText(wellhead_coords),
      canAssignCustomer,
      emptyToNullText(customer),
      customer_id ?? null,
      api,
    ]
  );

  if (updatedWell.rows.length === 0) {
    throw new Error("Not found");
  }

  let currentTestId = updatedWell.rows[0].current_test_id;

  if (shouldWriteTest) {
    const hasAnyValue = Boolean(testedAt || expiresAt);

    if (hasAnyValue) {
      if (currentTestId) {
        await q(
          `
          UPDATE well_tests
          SET
            tested_at  = COALESCE($1, tested_at),
            expires_at = $2
          WHERE id = $3
          `,
          [testedAt, expiresAt, currentTestId]
        );
      } else {
        const inserted = await q(
          `
          INSERT INTO well_tests (
            well_api,
            tested_at,
            expires_at,
            tested_by_company
          ) VALUES ($1, $2, $3, $4)
          RETURNING id
          `,
          [api, testedAt, expiresAt, "Manual edit (approved/admin)"]
        );

        const newTestId = inserted.rows?.[0]?.id;
        if (newTestId) {
          await q(`UPDATE wells SET current_test_id = $1 WHERE api = $2`, [newTestId, api]);
          currentTestId = newTestId;
        }
      }

      await q(
        `
        UPDATE wells
        SET
          current_tested_at = COALESCE($1, current_tested_at),
          current_expires_at = $2
        WHERE api = $3
        `,
        [testedAt, expiresAt, api]
      );
    }
  }

  return await loadWellByApi(api);
}

export async function GET(_req, { params }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return noStoreJson({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const api = decodeURIComponent(params.api);
    const well = await loadWellByApi(api);

    if (!well) {
      return noStoreJson({ error: "Not found" }, { status: 404 });
    }

    const canViewAllWells = hasPermission(session, "can_view_all_wells");
    const companyId = session.user.company_id || null;

    if (!canViewAllWells) {
      if (!companyId || well.company_id !== companyId) {
        return noStoreJson({ error: "Forbidden" }, { status: 403 });
      }
    }

    return noStoreJson(well);
  } catch (err) {
    console.error("GET /api/wells/[api] error:", err);
    return noStoreJson({ error: String(err?.message || err) }, { status: 500 });
  }
}

export async function PUT(req, { params }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return noStoreJson({ error: "Unauthorized" }, { status: 401 });
  }

  const role = session.user.role || "customer";
  const canViewAllWells = hasPermission(session, "can_view_all_wells");
  const canEditWells = hasPermission(session, "can_edit_wells");
  const canEditCompanyContacts = hasPermission(session, "can_edit_company_contacts");
  const companyId = session.user.company_id || null;

  if (!canEditWells && !canEditCompanyContacts) {
    return noStoreJson({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const api = decodeURIComponent(params.api);
    const body = await req.json();

    const existing = await loadWellByApi(api);
    if (!existing) {
      return noStoreJson({ error: "Not found" }, { status: 404 });
    }

    if (!canViewAllWells) {
      if (!companyId || existing.company_id !== companyId) {
        return noStoreJson({ error: "Forbidden" }, { status: 403 });
      }
    }

    const adminEditableFields = [
      "lease_well_name",
      "company_name",
      "company_email",
      "company_phone",
      "company_address",
      "company_man_name",
      "company_man_email",
      "company_man_phone",
      "previous_anchor_company",
      "previous_anchor_work",
      "directions_other_notes",
      "status",
      "state",
      "county",
      "wellhead_coords",
      "customer",
      "customer_id",
      "current_tested_at",
      "current_expires_at",
    ];

    const employeeEditableFields = [
      "lease_well_name",
      "company_name",
      "company_email",
      "company_phone",
      "company_address",
      "company_man_name",
      "company_man_email",
      "company_man_phone",
      "previous_anchor_company",
      "previous_anchor_work",
      "directions_other_notes",
      "status",
      "state",
      "county",
      "wellhead_coords",
    ];

    const customerEditableFields = [
      "company_email",
      "company_phone",
      "company_address",
      "company_man_name",
      "company_man_email",
      "company_man_phone",
      "previous_anchor_work",
      "directions_other_notes",
    ];

    let allowedFields = [];

    if (role === "admin") {
      allowedFields = adminEditableFields;
    } else if (role === "employee") {
      allowedFields = employeeEditableFields;
    } else {
      allowedFields = customerEditableFields;
    }

    const diff = buildDiff(existing, body, allowedFields);

    if (Object.keys(diff).length === 0) {
      return noStoreJson({
        ok: true,
        mode: "noop",
        message: "No changes detected.",
      });
    }

    // Admin updates apply immediately
    if (role === "admin") {
      const well = await applyWellUpdate(api, diff, true);
      return noStoreJson({
        ok: true,
        mode: "applied",
        message: "Well updated successfully.",
        well,
      });
    }

    // Employee + customer updates become pending approval
    await q(
      `
      INSERT INTO pending_changes (
        kind,
        submitted_by,
        status,
        payload
      )
      VALUES ($1, $2, 'pending', $3::jsonb)
      `,
      [
        "well_update_request",
        session.user.email || session.user.name || "Unknown user",
        JSON.stringify({
          api,
          requested_by_user_id: session.user.id,
          requested_by_name: session.user.name || "",
          requested_by_email: session.user.email || "",
          requested_by_role: role,
          changes: diff,
          existing_snapshot: existing,
        }),
      ]
    );

    return noStoreJson({
      ok: true,
      mode: "pending",
      message: "Your changes were submitted for admin approval.",
    });
  } catch (err) {
    console.error("PUT /api/wells/[api] error:", err);
    return noStoreJson({ error: String(err?.message || err) }, { status: 500 });
  }
}
