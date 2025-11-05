import { NextResponse } from "next/server";
import nodemailer from "nodemailer";
import crypto from "crypto";
import { sql } from "@vercel/postgres";

export const dynamic = "force-dynamic";

function mask(v) {
  if (!v) return v;
  if (v.length <= 4) return "***";
  return `${v.slice(0, 2)}***${v.slice(-2)}`;
}

export async function POST(req) {
  try {
    const { email } = await req.json();

    if (!email) {
      console.error("[FORGOT] Missing email");
      return NextResponse.json({ ok: true }); // Never leak existence
    }

    const token = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 1000 * 60 * 30); // 30 min

    // store token
    await sql`
      INSERT INTO reset_tokens (email, token, expires_at)
      VALUES (${email}, ${token}, ${expiresAt.toISOString()})
    `;

    const baseUrl = process.env.NEXTAUTH_URL || "";
    const resetUrl = `${baseUrl}/reset?token=${encodeURIComponent(token)}`;

    // MAIL_DEBUG short-circuit: return link instead of sending
    if (process.env.MAIL_DEBUG === "true") {
      console.log("[FORGOT][DEBUG] Generated reset URL:", resetUrl);
      return NextResponse.json({ ok: true, debugLink: resetUrl });
    }

    // send email
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT || 465),
      secure: String(process.env.SMTP_SECURE || "true") === "true",
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    console.log("[FORGOT] SMTP host:", process.env.SMTP_HOST, "port:", process.env.SMTP_PORT, "secure:", process.env.SMTP_SECURE);
    console.log("[FORGOT] SMTP user:", mask(process.env.SMTP_USER));

    const info = await transporter.sendMail({
      from: process.env.EMAIL_FROM,
      to: email,
      subject: "Reset your Select Anchors password",
      text: `Reset your password: ${resetUrl}`,
      html: `<p>Reset your password:</p><p><a href="${resetUrl}">${resetUrl}</a></p>`,
    });

    console.log("[FORGOT] Email sent, messageId:", info.messageId);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[FORGOT] Error:", err);
    // In debug, expose error to browser to speed up testing
    if (process.env.MAIL_DEBUG === "true") {
      return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
    }
    return NextResponse.json({ ok: true }); // generic
  }
}
