// /app/api/admin/users/route.js
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/nextauth-options";
import { q } from "@/lib/db";
import crypto from "crypto";
import nodemailer from "nodemailer";

async function requireAdmin() {
  const session = await getServerSession(authOptions);
  if (!session || session.user?.role !== "admin") {
    console.warn("[ADMIN_USERS][AUTH] Unauthorized access attempt");
    return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }
  return { session };
}

export async function GET() {
  const gate = await requireAdmin();
  if (gate.error) return gate.error;

  const { rows } = await q(
    `SELECT id, name, email, role, is_active, created_at
       FROM users
      ORDER BY created_at DESC`
  );

  return NextResponse.json({ users: rows });
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

    // 🔒 Normalize email
    const email = rawEmail.trim().toLowerCase();

    if (!email) {
      return NextResponse.json({ error: "Email required" }, { status: 400 });
    }

    console.log("[ADMIN_USERS][POST] Creating user:", { email, role, is_active });

    // Optional basic email shape check
    if (!email.includes("@") || !email.includes(".")) {
      return NextResponse.json(
        { error: "Email format looks invalid." },
        { status: 400 }
      );
    }

    // Validate role (optional but nice)
    const allowedRoles = ["admin", "employee", "customer"];
    if (!allowedRoles.includes(role)) {
      return NextResponse.json(
        { error: `Invalid role. Must be one of: ${allowedRoles.join(", ")}` },
        { status: 400 }
      );
    }

    // 🔍 Check for existing user (case-insensitive)
    const { rows: existing } = await q(
      `SELECT id FROM users WHERE LOWER(email) = $1`,
      [email]
    );

    if (existing.length) {
      console.warn("[ADMIN_USERS][POST] Email already exists:", email);
      return NextResponse.json({ error: "Email already exists" }, { status: 400 });
    }

    // ✅ Insert new user with normalized email
    const { rows } = await q(
      `INSERT INTO users (name, email, role, is_active)
       VALUES ($1, $2, $3, $4)
       RETURNING id, email`,
      [rawName || null, email, role, !!is_active]
    );

    const user = rows[0];

    // 🔐 Send reset/setup email (using reset_tokens, same as Forgot flow)
    if (sendReset) {
      const rawToken = crypto.randomBytes(32).toString("hex");
      const tokenHash = crypto
        .createHash("sha256")
        .update(rawToken)
        .digest("hex");
      const expiresAt = new Date(Date.now() + 1000 * 60 * 60); // 1 hour

      // Store reset token
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

      console.log("[ADMIN_USERS][POST] Created reset token for:", email);
      console.log("[ADMIN_USERS][POST] Reset URL:", resetLink);

      // SMTP config (same style as /api/auth/forgot)
      const {
        SMTP_HOST,
        SMTP_PORT,
        SMTP_USER,
        SMTP_PASS,
        SMTP_FROM,
      } = process.env;

      if (!SMTP_HOST || !SMTP_PORT || !SMTP_USER || !SMTP_PASS || !SMTP_FROM) {
        console.error("[ADMIN_USERS][ERROR] Missing SMTP env vars when creating user", {
          hasHost: !!SMTP_HOST,
          hasPort: !!SMTP_PORT,
          hasUser: !!SMTP_USER,
          hasPass: !!SMTP_PASS,
          hasFrom: !!SMTP_FROM,
        });
      } else {
        try {
          const transporter = nodemailer.createTransport({
            host: SMTP_HOST,
            port: Number(SMTP_PORT),
            secure: Number(SMTP_PORT) === 465, // true for 465
            auth: { user: SMTP_USER, pass: SMTP_PASS },
          });

          const info = await transporter.sendMail({
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

          console.log("[ADMIN_USERS][POST] Reset email sent:", info?.messageId || info);
        } catch (mailErr) {
          console.error("[ADMIN_USERS][ERROR] Failed to send reset email:", mailErr);
        }
      }
    }

    return NextResponse.json({ ok: true, id: user.id });
  } catch (e) {
    console.error("[ADMIN_USERS][POST][ERROR]", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
