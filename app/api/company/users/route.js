// app/api/company/users/route.js
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../../../lib/nextauth-options";
import { q } from "../../../../lib/db";
import { hasPermission } from "../../../../lib/permissions";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const SAFE_COMPANY_PERMISSIONS = [
  "can_view_all_company_wells",
  "can_edit_company_contacts",
  "can_export_csv",
  "can_manage_company_users",
  "can_edit_company_users",
  "can_reset_company_passwords",
];

function cleanPermissions(input = {}) {
  const out = {};
  for (const key of SAFE_COMPANY_PERMISSIONS) {
    out[key] = !!input[key];
  }
  return out;
}

function canAccessCompanyUsers(session) {
  return (
    hasPermission(session, "can_manage_company_users") ||
    hasPermission(session, "can_edit_company_users")
  );
}

export async function GET() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!canAccessCompanyUsers(session)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const companyId = session.user.company_id;

  if (!companyId) {
    return NextResponse.json(
      { error: "Your account is not assigned to a company." },
      { status: 400 }
    );
  }

  try {
    const { rows } = await q(
      `
      SELECT
        id,
        name,
        email,
        phone,
        role,
        is_active,
        company_id,
        company_name,
        permissions_json,
        created_at
      FROM users
      WHERE company_id = $1
      ORDER BY created_at DESC
      `,
      [companyId]
    );

    return NextResponse.json({
      users: rows,
      company_id: companyId,
      company_name: session.user.company_name || "",
      safe_permissions: SAFE_COMPANY_PERMISSIONS,
    });
  } catch (err) {
    console.error("[COMPANY_USERS_GET_ERROR]", err);
    return NextResponse.json(
      { error: err?.message || "Failed to load company users." },
      { status: 500 }
    );
  }
}

export async function POST(req) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!hasPermission(session, "can_manage_company_users")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const companyId = session.user.company_id;

  if (!companyId) {
    return NextResponse.json(
      { error: "Your account is not assigned to a company." },
      { status: 400 }
    );
  }

  try {
    const body = await req.json();

    const name = String(body.name || "").trim();
    const email = String(body.email || "").trim().toLowerCase();
    const phone = String(body.phone || "").trim();
    const permissions = cleanPermissions(body.permissions_json || {});

    if (!name) {
      return NextResponse.json({ error: "Name is required." }, { status: 400 });
    }

    if (!email) {
      return NextResponse.json({ error: "Email is required." }, { status: 400 });
    }

    if (!email.includes("@") || !email.includes(".")) {
      return NextResponse.json(
        { error: "Email format looks invalid." },
        { status: 400 }
      );
    }

    const existingUser = await q(
      `
      SELECT id
      FROM users
      WHERE LOWER(email) = $1
      LIMIT 1
      `,
      [email]
    );

    if (existingUser.rows.length) {
      return NextResponse.json(
        { error: "A user with that email already exists." },
        { status: 400 }
      );
    }

    const existingPending = await q(
      `
      SELECT id
      FROM pending_changes
      WHERE status = 'pending'
        AND kind = 'company_user_create_request'
        AND LOWER(payload->'new_user'->>'email') = $1
      LIMIT 1
      `,
      [email]
    );

    if (existingPending.rows.length) {
      return NextResponse.json(
        { error: "A pending request already exists for that email." },
        { status: 400 }
      );
    }

    await q(
      `
      INSERT INTO pending_changes (
        kind,
        submitted_by,
        status,
        payload,
        created_at
      )
      VALUES ($1, $2, 'pending', $3::jsonb, NOW())
      `,
      [
        "company_user_create_request",
        session.user.id,
        JSON.stringify({
          company_id: companyId,
          company_name: session.user.company_name || "",
          requested_by_user_id: session.user.id,
          requested_by_name: session.user.name || "",
          requested_by_email: session.user.email || "",
          requested_by_role: session.user.role || "",
          new_user: {
            name,
            email,
            phone: phone || null,
            role: "customer",
            permissions_json: permissions,
          },
        }),
      ]
    );

    return NextResponse.json({
      ok: true,
      message: "User request submitted for Select Anchors approval.",
    });
  } catch (err) {
    console.error("[COMPANY_USERS_POST_ERROR]", err);
    return NextResponse.json(
      { error: err?.message || "Failed to submit user request." },
      { status: 500 }
    );
  }
}
