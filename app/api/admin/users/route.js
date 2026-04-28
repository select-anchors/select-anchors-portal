// /app/api/admin/users/route.js
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import bcrypt from "bcrypt";
import crypto from "crypto";
import nodemailer from "nodemailer";
import { authOptions } from "../../../../lib/nextauth-options";
import { q } from "../../../../lib/db";
import { getDefaultPermissions } from "../../../../lib/permissions";

async function requireAdmin() {
  const session = await getServerSession(authOptions);

  if (!session || session.user?.role !== "admin") {
    return {
      error: NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      ),
    };
  }

  return { session };
}

export async function POST(req) {
  const gate = await requireAdmin();
  if (gate.error) return gate.error;

  const body = await req.json();

  const email = body.email?.toLowerCase().trim();
  const temporaryPassword = body.temporaryPassword || "";

  if (!email) {
    return NextResponse.json(
      { error: "Email required" },
      { status: 400 }
    );
  }

  let passwordHash = null;

  if (temporaryPassword) {

    if (temporaryPassword.length < 8) {
      return NextResponse.json(
        { error: "Temp password must be at least 8 characters" },
        { status: 400 }
      );
    }

    passwordHash = await bcrypt.hash(temporaryPassword, 10);
  }

  const permissions = getDefaultPermissions(body.role || "customer");

  const { rows } = await q(
    `
    INSERT INTO users (
      name,
      email,
      role,
      phone,
      company_name,
      permissions_json,
      password_hash
    )
    VALUES ($1,$2,$3,$4,$5,$6::jsonb,$7)
    RETURNING id,email
    `,
    [
      body.name || null,
      email,
      body.role || "customer",
      body.phone || null,
      body.company_name || null,
      JSON.stringify(permissions),
      passwordHash,
    ]
  );

  return NextResponse.json({
    ok: true,
    id: rows[0].id,
  });
}
