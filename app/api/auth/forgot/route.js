// app/api/auth/forgot/route.js
import { NextResponse } from "next/server";
import { sql } from "@vercel/postgres";
import crypto from "crypto";
import nodemailer from "nodemailer";

export async function POST(req) {
  try {
    const body = await req.json();
    const email = body?.email?.trim();

    if (!email) {
      console.error("[FORGOT][ERROR] No email provided");
      return NextResponse.json(
        { error: "Email is required." },
        { status: 400 }
      );
    }

    // 1) Create token + hash
    const token = crypto.randomBytes(32).toString("hex");
    const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    // 2) Store reset token
    try {
      await sql`
        INSERT INTO reset_tokens (email, token_hash, expires_at)
        VALUES (${email}, ${tokenHash}, ${expiresAt.toISOString()})
      `;
      console.log("[FORGOT][INFO] Stored reset token for", email);
    } catch (dbErr) {
      console.error("[FORGOT][ERROR] DB insert failed:", dbErr);
      return NextResponse.json(
        { error: "Could not create reset token." },
        { status: 500 }
      );
    }

    // 3) Build reset URL
    const baseUrl =
      process.env.NEXT_PUBLIC_APP_URL ||
      (process.env.VERCEL_URL
        ? `https://${process.env.VERCEL_URL}`
        : "http://localhost:3000");

    const resetUrl = `${baseUrl}/reset?token=${token}`;
    console.log("[FORGOT][DEBUG] Generated reset URL:", resetUrl);

    // 4) Configure Nodemailer transport
    const host = process.env.SMTP_HOST;
    const port = Number(process.env.SMTP_PORT || 587);
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;
    const from = process.env.EMAIL_FROM || user;

    console.log("[FORGOT][DEBUG] SMTP settings preview:", {
      host,
      port,
      hasUser: !!user,
      hasPass: !!pass,
      from,
    });

    const transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465, // true for 465, false for 587/25
      auth: {
        user,
        pass,
      },
    });

    // 5) Actually send email
    try {
      const info = await transporter.sendMail({
        from,
        to: email,
        subject: "Select Anchors — password reset",
        text: `Click the link below to reset your password:\n\n${resetUrl}\n\nIf you did not request this, you can ignore this email.`,
        html: `
          <p>Click the button below to reset your password:</p>
          <p><a href="${resetUrl}" style="padding:10px 16px;background:#23443c;color:#fff;border-radius:6px;text-decoration:none;">Reset Password</a></p>
          <p>Or copy and paste this link into your browser:</p>
          <p><code>${resetUrl}</code></p>
        `,
      });

      console.log("[FORGOT][INFO] sendMail success:", {
        messageId: info.messageId,
        accepted: info.accepted,
        rejected: info.rejected,
      });
    } catch (mailErr) {
      console.error("[FORGOT][ERROR] sendMail failed:", mailErr);
      return NextResponse.json(
        { error: "Failed to send reset email." },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[FORGOT][ERROR] Unhandled:", err);
    return NextResponse.json(
      { error: "Something went wrong." },
      { status: 500 }
    );
  }
}
