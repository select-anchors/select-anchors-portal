// app/api/admin/wells/bulk-update/route.js
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

function emptyToNullText(v) {
  if (v === "" || v === undefined) return null;
  return v;
}

export async function POST(req) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return noStoreJson({ error: "Unauthorized" }, { status: 401 });
  }

  const canEditWells = hasPermission(session, "can_edit_wells");
  const canBulkEditWells = hasPermission(session, "can_bulk_edit_wells");

  if (!canEditWells || !canBulkEditWells) {
    return noStoreJson({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const body = await req.json();

    const apis = Array.isArray(body?.apis)
      ? body.apis.map((x) => String(x || "").trim()).filter(Boolean)
      : [];

    const changes = body?.changes || {};

    if (apis.length === 0) {
      return noStoreJson(
        { error: "Please provide at least one API." },
        { status: 400 }
      );
    }

    const allowedFields = [
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
      "state",
      "county",
      "wellhead_coords",
      "status",
    ];

    const providedFields = Object.keys(changes).filter((key) =>
      allowedFields.includes(key)
    );

    if (providedFields.length === 0) {
      return noStoreJson(
        { error: "No valid changes were provided." },
        { status: 400 }
      );
    }

    const setClauses = [];
    const values = [];
    let i = 1;

    for (const field of providedFields) {
      setClauses.push(`${field} = $${i}`);
      values.push(emptyToNullText(changes[field]));
      i += 1;
    }

    setClauses.push(`updated_at = NOW()`);

    values.push(apis);

    const sql = `
      UPDATE wells
      SET ${setClauses.join(", ")}
      WHERE api = ANY($${i}::text[])
      RETURNING api
    `;

    const result = await q(sql, values);

    return noStoreJson({
      ok: true,
      updated_count: result.rows.length,
      updated_apis: result.rows.map((r) => r.api),
    });
  } catch (err) {
    console.error("POST /api/admin/wells/bulk-update error:", err);
    return noStoreJson(
      { error: String(err?.message || err) },
      { status: 500 }
    );
  }
}
