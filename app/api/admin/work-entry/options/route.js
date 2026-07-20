// app/api/admin/work-entry/options/route.js

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../../../../lib/nextauth-options";
import { q } from "../../../../../lib/db";
import { hasPermission } from "../../../../../lib/permissions";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function noStoreJson(data, init = {}) {
  const response = NextResponse.json(data, init);

  response.headers.set(
    "Cache-Control",
    "no-store, no-cache, must-revalidate, proxy-revalidate"
  );
  response.headers.set("Pragma", "no-cache");
  response.headers.set("Expires", "0");

  return response;
}

export async function GET() {
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
    const [companiesResult, contactsResult] = await Promise.all([
      q(
        `
        SELECT
          id,
          name,
          email,
          phone,
          address,
          max_anchor_exposed_inches
        FROM companies
        WHERE is_active = TRUE
        ORDER BY name ASC
        `
      ),

      q(
        `
        SELECT
          id,
          company_id,
          name,
          email,
          phone,
          contact_type
        FROM company_contacts
        WHERE is_active = TRUE
        ORDER BY name ASC
        `
      ),
    ]);

    return noStoreJson({
      companies: companiesResult.rows,
      contacts: contactsResult.rows,
    });
  } catch (error) {
    console.error("[WORK_ENTRY_OPTIONS_ERROR]", error);

    return noStoreJson(
      {
        error:
          error?.message ||
          "Failed to load companies and company contacts.",
      },
      { status: 500 }
    );
  }
}
