// app/api/admin/changes/[id]/approve/route.js
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../../../../../lib/nextauth-options";
import { q } from "../../../../../../lib/db";
import { hasPermission } from "../../../../../../lib/permissions";

export const dynamic = "force-dynamic";
export const revalidate = 0;

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
      w.current_test_id
    FROM wells w
    WHERE w.api = $1
    LIMIT 1
    `,
    [api]
  );

  return rows?.[0] ?? null;
}

export async function POST(_req, { params }) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!hasPermission(session, "can_approve_changes")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = params;

  try {
    const { rows: changes } = await q(
      `
      SELECT *
      FROM pending_changes
      WHERE id = $1
        AND status = 'pending'
      LIMIT 1
      `,
      [id]
    );

    if (!changes.length) {
      return NextResponse.json({ error: "Not found or not pending" }, { status: 404 });
    }

    const change = changes[0];
    const payload = change.payload || {};

    if (payload.kind && payload.kind !== "well_update_request") {
      return NextResponse.json({ error: "Unsupported change kind" }, { status: 400 });
    }

    if (change.kind !== "well_update_request") {
      return NextResponse.json({ error: "Unsupported change kind" }, { status: 400 });
    }

    const api = payload.api;
    const diff = payload.changes || {};

    if (!api) {
      return NextResponse.json({ error: "Missing API in change payload" }, { status: 400 });
    }

    const existingWell = await loadWellByApi(api);
    if (!existingWell) {
      return NextResponse.json({ error: "Target well not found" }, { status: 404 });
    }

    await q("BEGIN");

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
    } = diff;

    await q(
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
        customer                = COALESCE($16, customer),
        customer_id             = COALESCE($17, customer_id),
        updated_at              = NOW()
      WHERE api = $18
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
        emptyToNullText(customer),
        customer_id ?? null,
        api,
      ]
    );

    const testedAt = emptyToNullDate(current_tested_at);
    const expiresAt = emptyToNullDate(current_expires_at);
    const shouldWriteTest =
      current_tested_at !== undefined || current_expires_at !== undefined;

    if (shouldWriteTest) {
      const hasAnyValue = Boolean(testedAt || expiresAt);

      if (hasAnyValue) {
        let currentTestId = existingWell.current_test_id;

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
            [api, testedAt, expiresAt, "Approved pending change"]
          );

          currentTestId = inserted.rows?.[0]?.id || null;

          if (currentTestId) {
            await q(
              `UPDATE wells SET current_test_id = $1 WHERE api = $2`,
              [currentTestId, api]
            );
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

    await q(
      `
      UPDATE pending_changes
      SET
        status = 'approved',
        decided_at = NOW()
      WHERE id = $1
      `,
      [id]
    );

    await q("COMMIT");

    return NextResponse.json({ ok: true });
  } catch (e) {
    await q("ROLLBACK").catch(() => {});
    console.error("[ADMIN_CHANGE_APPROVE_ERROR]", e);
    return NextResponse.json(
      { error: e?.message || "Failed to approve change" },
      { status: 500 }
    );
  }
}
