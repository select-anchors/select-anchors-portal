// app/api/auth/forgot/route.js
import { NextResponse } from "next/server";
import { sql } from "@vercel/postgres";
import crypto from "crypto";
import nodemailer from "nodemailer";

function getBaseUrl() {
  if (process.env.NEXT_PUBLIC_APP_URL) return process.env.NEXT_PUBLIC_APP_URL;
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return "http://localhost:3000";
}

export async function POST(req) {
  try {
    const { email } = await req.json();

    if (!email) {
      return NextResponse.json(
        { error: "Email is required." },
        { status: 400 }
      );
    }

    // Optional: ensure user exists, but don't leak existence in response
    const { rows: users } = await sql`
      SELECT id, email FROM users WHERE email = ${email} LIMIT 1
    `;
    if (users.length === 0) {
      // Respond with success anyway
      return NextResponse.json({ ok: true });
    }

    // Generate token & hash
    const token = crypto.randomBytes(32).toString("hex"); // 64-char hex
    const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
    const expiresAt = new Date(Date.now() + 1000 * 60 * 60); // 1 hour

    await sql`
      INSERT INTO reset_tokens (email, token_hash, expires_at)
      VALUES (${email}, ${tokenHash}, ${expiresAt})
    `;

    const resetUrl = `${getBaseUrl()}/reset?token=${token}`;

    // Send email
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT || 587),
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    await transporter.sendMail({
      to: email,
      from: process.env.SMTP_FROM || process.env.SMTP_USER,
      subject: "Reset your Select Anchors password",
      text: `Click this link to reset your password: ${resetUrl}`,
      html: `<p>Click this link to reset your password:</p><p><a href="${resetUrl}">${resetUrl}</a></p>`,
    });

    console.log("[FORGOT][DEBUG] Generated reset URL:", resetUrl);

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[FORGOT][ERROR]", err);
    return NextResponse.json(
      { error: "Unable to send reset link. Please try again later." },
      { status: 500 }
    );
  }
}
