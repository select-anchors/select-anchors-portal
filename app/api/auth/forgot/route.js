// app/api/auth/forgot/route.js
import { NextResponse } from "next/server";
import { sql } from "@vercel/postgres";
import crypto from "crypto";
import nodemailer from "nodemailer";

export async function POST(req) {
  try {
    const { email } = await req.json();

    if (!email) {
      return NextResponse.json(
        { error: "Email is required." },
        { status: 400 }
      );
    }

    // ⭐ NEW: normalize email
    const normalizedEmail = email.toLowerCase().trim();

    // 1) Generate token + hash
    const rawToken = crypto.randomBytes(32).toString("hex");
    const tokenHash = crypto
      .createHash("sha256")
      .update(rawToken)
      .digest("hex");

    const expiresAt = new Date(Date.now() + 1000 * 60 * 60); // 1 hour

    // 2) Store in reset_tokens (use normalized email)
    await sql`
      INSERT INTO reset_tokens (email, token_hash, expires_at)
      VALUES (${normalizedEmail}, ${tokenHash}, ${expiresAt.toISOString()})
    `;

    const baseUrl =
      process.env.NEXT_PUBLIC_APP_URL ||
      process.env.NEXTAUTH_URL ||
      "http://localhost:3000";

    const resetUrl = `${baseUrl.replace(/\/$/, "")}/reset?token=${rawToken}`;

    console.log("[FORGOT][DEBUG] Generated reset URL:", resetUrl);

    // 3) Check SMTP env vars
    const {
      SMTP_HOST,
      SMTP_PORT,
      SMTP_USER,
      SMTP_PASS,
      SMTP_FROM,
    } = process.env;

    if (!SMTP_HOST || !SMTP_PORT || !SMTP_USER || !SMTP_PASS || !SMTP_FROM) {
      console.error("[FORGOT][ERROR] Missing SMTP env vars", {
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

    // 4) Create transporter
    const transporter = nodemailer.createTransport({
      host: SMTP_HOST,
      port: Number(SMTP_PORT),
      secure: Number(SMTP_PORT) === 465,
      auth: {
        user: SMTP_USER,
        pass: SMTP_PASS,
      },
    });

    console.log("[FORGOT][DEBUG] About to send mail to:", normalizedEmail);

    // 5) Send email
    const info = await transporter.sendMail({
      from: SMTP_FROM,
      to: normalizedEmail,
      subject: "Select Anchors – Reset your password",
      text: `Click the link below to reset your password:\n\n${resetUrl}\n\nIf you did not request this, you can ignore this email.`,
      html: `
        <p>Click the link below to reset your password:</p>
        <p><a href="${resetUrl}">${resetUrl}</a></p>
        <p>If you did not request this, you can ignore this email.</p>
      `,
    });

    console.log("[FORGOT][DEBUG] sendMail result:", info?.messageId || info);

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[FORGOT][ERROR] Unexpected error in /api/auth/forgot:", err);
    return NextResponse.json(
      { error: "Unable to send reset link. Please try again later." },
      { status: 500 }
    );
  }
}
