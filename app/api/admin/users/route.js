// /app/api/admin/users/route.js
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../../../lib/nextauth-options";
import { q } from "../../../../lib/db";
import crypto from "crypto";
import nodemailer from "nodemailer";
import { getDefaultPermissions } from "../../../../lib/permissions";

function normalizeCompanyName(name) {
  return String(name || "").trim().replace(/\s+/g, " ");
}

async function requireAdmin() {
  const session = await getServerSession(authOptions);
  if (!session || session.user?.role !== "admin") {
    console.warn("[ADMIN_USERS][AUTH] Unauthorized access attempt");
    return {
      error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }
  return { session };
}

async function getOrCreateCompany(companyName, role) {
  let cleanName = normalizeCompanyName(companyName);

  if (!cleanName && (role === "admin" || role === "employee")) {
    cleanName = "Select Anchors";
  }

  if (!cleanName) {
    return null;
  }

  const normalized = cleanName.toLowerCase();

  const existing = await q(
    `
    SELECT id, name, permissions_json
    FROM companies
    WHERE normalized_name = $1
    LIMIT 1
    `,
    [normalized]
  );

  if (existing.rows[0]) {
    return existing.rows[0];
  }

  const inserted = await q(
    `
    INSERT INTO companies (name, normalized_name, permissions_json)
    VALUES ($1, $2, '{}'::jsonb)
    RETURNING id, name, permissions_json
    `,
    [cleanName, normalized]
  );

  return inserted.rows[0];
}

export async function GET() {
  const gate = await requireAdmin();
  if (gate.error) return gate.error;

  const usersRes = await q(
    `
    SELECT
      u.id,
      u.name,
      u.email,
      u.role,
      u.is_active,
      u.phone,
      u.company_id,
      COALESCE(u.company_name, c.name, '') AS company_name,
      u.permissions_json,
      c.permissions_json AS company_permissions_json,
      u.created_at
    FROM users u
    LEFT JOIN companies c ON c.id = u.company_id
    ORDER BY u.created_at DESC
    `
  );

  const companiesRes = await q(
    `
    SELECT id, name, permissions_json
    FROM companies
    WHERE is_active = TRUE
    ORDER BY name ASC
    `
  );

  return NextResponse.json({
    users: usersRes.rows,
    companies: companiesRes.rows,
  });
}

export async function POST(req) {
  const gate = await requireAdmin();
  if (gate.error) return gate.error;

  try {
    const body = await req.json();
    const rawName = body.name || "";
    const rawEmail = body.email || "";
    const role = body.role || "customer";
    const is_active = body.is_active ?? true;
    const sendReset = body.sendReset ?? true;
    const phone = body.phone || null;
    const company_name = body.company_name || null;

    const email = rawEmail.trim().toLowerCase();

    if (!email) {
      return NextResponse.json({ error: "Email required" }, { status: 400 });
    }

    if (!email.includes("@") || !email.includes(".")) {
      return NextResponse.json(
        { error: "Email format looks invalid." },
        { status: 400 }
      );
    }

    const allowedRoles = ["admin", "employee", "customer"];
    if (!allowedRoles.includes(role)) {
      return NextResponse.json(
        { error: `Invalid role. Must be one of: ${allowedRoles.join(", ")}` },
        { status: 400 }
      );
    }

    const { rows: existing } = await q(
      `SELECT id FROM users WHERE LOWER(email) = $1`,
      [email]
    );

    if (existing.length) {
      return NextResponse.json(
        { error: "Email already exists" },
        { status: 400 }
      );
    }

    const company = await getOrCreateCompany(company_name, role);
    const defaultPermissions = getDefaultPermissions(role);

    const { rows } = await q(
      `
      INSERT INTO users (
        name,
        email,
        role,
        is_active,
        phone,
        company_id,
        company_name,
        permissions_json
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8::jsonb)
      RETURNING id, email
      `,
      [
        rawName || null,
        email,
        role,
        !!is_active,
        phone,
        company?.id ?? null,
        company?.name ?? null,
        JSON.stringify(defaultPermissions),
      ]
    );

    const user = rows[0];

    if (sendReset) {
      const rawToken = crypto.randomBytes(32).toString("hex");
      const tokenHash = crypto
        .createHash("sha256")
        .update(rawToken)
        .digest("hex");
      const expiresAt = new Date(Date.now() + 1000 * 60 * 60);

      await q(
        `INSERT INTO reset_tokens (email, token_hash, expires_at)
         VALUES ($1, $2, $3)`,
        [email, tokenHash, expiresAt.toISOString()]
      );

      const baseUrl =
        process.env.NEXT_PUBLIC_APP_URL ||
        process.env.NEXTAUTH_URL ||
        "https://app.selectanchors.com";

      const resetLink = `${baseUrl.replace(/\/$/, "")}/reset?token=${rawToken}`;

      const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM } =
        process.env;

      if (SMTP_HOST && SMTP_PORT && SMTP_USER && SMTP_PASS && SMTP_FROM) {
        try {
          const transporter = nodemailer.createTransport({
            host: SMTP_HOST,
            port: Number(SMTP_PORT),
            secure: Number(SMTP_PORT) === 465,
            auth: { user: SMTP_USER, pass: SMTP_PASS },
          });

          await transporter.sendMail({
            from: SMTP_FROM,
            to: user.email,
            subject: "Select Anchors – Set up your password",
            text: `Welcome to Select Anchors.\n\nClick the link below to set your password:\n\n${resetLink}\n\nIf you did not expect this email, you can ignore it.`,
            html: `
              <p>Welcome to Select Anchors.</p>
              <p>Click the link below to set your password:</p>
              <p><a href="${resetLink}">${resetLink}</a></p>
              <p>If you did not expect this email, you can ignore it.</p>
            `,
          });
        } catch (mailErr) {
          console.error("[ADMIN_USERS][ERROR] Failed to send reset email:", mailErr);
        }
      } else {
        console.error("[ADMIN_USERS][ERROR] Missing SMTP env vars");
      }
    }

    return NextResponse.json({ ok: true, id: user.id });
  } catch (e) {
    console.error("[ADMIN_USERS][POST][ERROR]", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
