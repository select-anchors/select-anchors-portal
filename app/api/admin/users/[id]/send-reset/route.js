// app/api/admin/users/[id]/send-reset/route.js
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/nextauth-options";
import { sql } from "@vercel/postgres";
import crypto from "crypto";
import nodemailer from "nodemailer";

async function requireAdmin() {
  const session = await getServerSession(authOptions);
  if (!session || session.user?.role !== "admin") {
    return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }
  return { session };
}

export async function POST(_req, { params }) {
  try {
    const gate = await requireAdmin();
    if (gate.error) return gate.error;

    const userId = params.id;

    // 1) Look up the user by ID
    const { rows } = await sql`
      SELECT id, email, name
      FROM users
      WHERE id = ${userId}
      LIMIT 1
    `;
    const user = rows[0];

    if (!user) {
      return NextResponse.json(
        { error: "User not found." },
        { status: 404 }
      );
    }

    const email = (user.email || "").toLowerCase().trim();

    // 2) Generate reset token + hash (same pattern as /api/auth/forgot)
    const rawToken = crypto.randomBytes(32).toString("hex");
    const tokenHash = crypto
      .createHash("sha256")
      .update(rawToken)
      .digest("hex");

    const expiresAt = new Date(Date.now() + 1000 * 60 * 60); // 1 hour

    // 3) Insert into reset_tokens
    await sql`
      INSERT INTO reset_tokens (email, token_hash, expires_at)
      VALUES (${email}, ${tokenHash}, ${expiresAt.toISOString()})
    `;

    const baseUrl =
      process.env.NEXT_PUBLIC_APP_URL ||
      process.env.NEXTAUTH_URL ||
      "http://localhost:3000";

    const resetUrl = `${baseUrl.replace(/\/$/, "")}/reset?token=${rawToken}`;

    console.log("[ADMIN][SEND-RESET][DEBUG] reset URL:", resetUrl, "for", email);

    // 4) Check SMTP env vars
    const {
      SMTP_HOST,
      SMTP_PORT,
      SMTP_USER,
      SMTP_PASS,
      SMTP_FROM,
    } = process.env;

    if (!SMTP_HOST || !SMTP_PORT || !SMTP_USER || !SMTP_PASS || !SMTP_FROM) {
      console.error("[ADMIN][SEND-RESET][ERROR] Missing SMTP env vars", {
        hasHost: !!SMTP_HOST,
        hasPort: !!SMTP_PORT,
        hasUser: !!SMTP_USER,
        hasPass: !!SMTP_PASS,
        hasFrom: !!SMTP_FROM,
      });

      return NextResponse.json(
        { error: "Email is not configured on the server." },
        { status: 500 }
      );
    }

    // 5) Send email
    const transporter = nodemailer.createTransport({
      host: SMTP_HOST,
      port: Number(SMTP_PORT),
      secure: Number(SMTP_PORT) === 465,
      auth: {
        user: SMTP_USER,
        pass: SMTP_PASS,
      },
    });

    const info = await transporter.sendMail({
      from: SMTP_FROM,
      to: email,
      subject: "Select Anchors – Set or reset your password",
      text: `Hello${user.name ? " " + user.name : ""},

An admin has sent you a password reset link for your Select Anchors account.

Click the link below to set or reset your password:

${resetUrl}

If you did not expect this email, you can ignore it.`,
      html: `
        <p>Hello${user.name ? " " + user.name : ""},</p>
        <p>An admin has sent you a password reset link for your Select Anchors account.</p>
        <p><a href="${resetUrl}">${resetUrl}</a></p>
        <p>If you did not expect this email, you can ignore it.</p>
      `,
    });

    console.log("[ADMIN][SEND-RESET][DEBUG] sendMail result:", info?.messageId || info);

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[ADMIN][SEND-RESET][ERROR]", err);
    return NextResponse.json(
      { error: "Unable to send reset link for this user." },
      { status: 500 }
    );
  }
}
