// app/api/admin/wells/import/route.js
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../../../../lib/nextauth-options";
import { q } from "../../../../../lib/db";
import { hasPermission } from "../../../../../lib/permissions";

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

function cleanText(value) {
  if (value === undefined || value === null) return null;
  const v = String(value).trim();
  return v === "" ? null : v;
}

export async function POST(req) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return noStoreJson({ error: "Unauthorized" }, { status: 401 });
  }

  const canViewAllWells = hasPermission(session, "can_view_all_wells");
  const canEditWells = hasPermission(session, "can_edit_wells");
  const canBulkEditWells = hasPermission(session, "can_bulk_edit_wells");

  if (!canViewAllWells || !canEditWells || !canBulkEditWells) {
    return noStoreJson({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const body = await req.json();
    const rows = Array.isArray(body?.rows) ? body.rows : [];

    if (rows.length === 0) {
      return noStoreJson(
        { error: "No rows were provided." },
        { status: 400 }
      );
    }

    const validRows = [];
    const invalidRows = [];

    for (const raw of rows) {
      const row = {
        api: cleanText(raw?.api),
        lease_well_name: cleanText(raw?.lease_well_name),
        company_name: cleanText(raw?.company_name),
        company_email: cleanText(raw?.company_email),
        company_phone: cleanText(raw?.company_phone),
        company_address: cleanText(raw?.company_address),
        company_man_name: cleanText(raw?.company_man_name),
        company_man_email: cleanText(raw?.company_man_email),
        company_man_phone: cleanText(raw?.company_man_phone),
        previous_anchor_company: cleanText(raw?.previous_anchor_company),
        previous_anchor_work: cleanText(raw?.previous_anchor_work),
        directions_other_notes: cleanText(raw?.directions_other_notes),
        wellhead_coords: cleanText(raw?.wellhead_coords),
        state: cleanText(raw?.state),
        county: cleanText(raw?.county),
        status: cleanText(raw?.status),
        __row_number: raw?.__row_number ?? null,
      };

      if (!row.api || !row.lease_well_name) {
        invalidRows.push({
          row_number: row.__row_number,
          api: row.api,
          lease_well_name: row.lease_well_name,
          reason: "Missing required field(s): api and/or lease_well_name",
        });
        continue;
      }

      validRows.push(row);
    }

    const inputApis = [...new Set(validRows.map((r) => r.api).filter(Boolean))];

    let existingApis = [];
    if (inputApis.length > 0) {
      const existing = await q(
        `
        SELECT api
        FROM wells
        WHERE api = ANY($1::text[])
        `,
        [inputApis]
      );

      existingApis = existing.rows.map((r) => r.api);
    }

    const existingSet = new Set(existingApis);
    const duplicates = [];
    const rowsToInsert = [];

    for (const row of validRows) {
      if (existingSet.has(row.api)) {
        duplicates.push({
          row_number: row.__row_number,
          api: row.api,
        });
      } else {
        rowsToInsert.push(row);
        existingSet.add(row.api);
      }
    }

    let insertedCount = 0;

    for (const row of rowsToInsert) {
      await q(
        `
        INSERT INTO wells (
          api,
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
          wellhead_coords,
          state,
          county,
          status,
          updated_at
        )
        VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8,
          $9, $10, $11, $12, $13, $14, $15, $16, NOW()
        )
        `,
        [
          row.api,
          row.lease_well_name,
          row.company_name,
          row.company_email,
          row.company_phone,
          row.company_address,
          row.company_man_name,
          row.company_man_email,
          row.company_man_phone,
          row.previous_anchor_company,
          row.previous_anchor_work,
          row.directions_other_notes,
          row.wellhead_coords,
          row.state,
          row.county,
          row.status,
        ]
      );

      insertedCount += 1;
    }

    return noStoreJson({
      ok: true,
      received_count: rows.length,
      inserted_count: insertedCount,
      duplicate_count: duplicates.length,
      invalid_count: invalidRows.length,
      duplicates,
      invalid_rows: invalidRows,
    });
  } catch (err) {
    console.error("POST /api/admin/wells/import error:", err);
    return noStoreJson(
      { error: String(err?.message || err) },
      { status: 500 }
    );
  }
}
