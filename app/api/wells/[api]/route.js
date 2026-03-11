// app/api/wells/[api]/route.js
import { NextResponse } from "next/server";
<<<<<<< Updated upstream
import { getServerSession } from "next-auth";
import { authOptions } from "../../../../lib/nextauth-options";
import { q } from "../../../../lib/db";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function noStoreJson(data, init = {}) {
  const res = NextResponse.json(data, init);
  res.headers.set("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
  res.headers.set("Pragma", "no-cache");
  res.headers.set("Expires", "0");
  return res;
}
=======
import { q } from "../../../../lib/db";
>>>>>>> Stashed changes

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
      w.lease_well_name,
      w.company_name, w.company_email, w.company_phone, w.company_address,
      w.company_man_name, w.company_man_email, w.company_man_phone,
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

    const role = session.user.role || "customer";
    if (role === "customer" && well.customer_id !== session.user.id) {
      return noStoreJson({ error: "Forbidden" }, { status: 403 });
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
  const isStaff = role === "admin" || role === "employee";

  try {
    const api = decodeURIComponent(params.api);
    const body = await req.json();

    const existing = await loadWellByApi(api);
    if (!existing) return noStoreJson({ error: "Not found" }, { status: 404 });

    if (!isStaff && existing.customer_id !== session.user.id) {
      return noStoreJson({ error: "Forbidden" }, { status: 403 });
    }

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
    } = body;

    const testedAt = emptyToNullDate(current_tested_at);
    const expiresAt = emptyToNullDate(current_expires_at);
    const shouldWriteTest =
      current_tested_at !== undefined || current_expires_at !== undefined;

    const updatedWell = await q(
      `
      UPDATE wells
      SET
        lease_well_name         = $1,
        company_name            = $2,
        company_email           = $3,
        company_phone           = $4,
        company_address         = $5,
        company_man_name        = $6,
        company_man_email       = $7,
        company_man_phone       = $8,
        previous_anchor_company = $9,
        previous_anchor_work    = $10,
        directions_other_notes  = $11,
        status                  = $12,
        state                   = $13,
        county                  = $14,
        wellhead_coords         = $15,
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
        isStaff,
        emptyToNullText(customer),
        customer_id ?? null,
        api,
      ]
    );

    if (updatedWell.rows.length === 0) {
      return noStoreJson({ error: "Not found" }, { status: 404 });
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
            [api, testedAt, expiresAt, "Manual edit (admin)"]
          );

          const newTestId = inserted.rows?.[0]?.id;
          if (newTestId) {
            await q(
              `UPDATE wells SET current_test_id = $1 WHERE api = $2`,
              [newTestId, api]
            );
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

    const well = await loadWellByApi(api);
    return noStoreJson(well);
  } catch (err) {
    console.error("PUT /api/wells/[api] error:", err);
    return noStoreJson({ error: String(err?.message || err) }, { status: 500 });
  }
}
