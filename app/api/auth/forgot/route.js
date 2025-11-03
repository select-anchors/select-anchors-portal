// /app/api/auth/forgot/route.js
import { NextResponse } from "next/server";
import crypto from "crypto";
import nodemailer from "nodemailer";
import { q } from "@/lib/db";

export async function POST(req) {
  try {
    const { email } = await req.json();
    if (!email) return NextResponse.json({ error: "Missing email" }, { status: 400 });

    // Look up the user
    const { rows } = await q(`SELECT id, email FROM users WHERE email = $1`, [email]);
    if (!rows.length) {
      // Prevent revealing existence of account
      return NextResponse.json({ ok: true });
    }

    const user = rows[0];
    const token = crypto.randomBytes(32).toString("hex");
    const expires = new Date(Date.now() + 1000 * 60 * 30); // 30 minutes

    // Store reset token
    await q(
      `INSERT INTO password_resets (user_id, token, expires_at)
       VALUES ($1, $2, $3)
       ON CONFLICT (user_id)
       DO UPDATE SET token = EXCLUDED.token, expires_at = EXCLUDED.expires_at`,
      [user.id, token, expires]
    );

    const resetLink = `${process.env.NEXTAUTH_URL || "https://app.selectanchors.com"}/reset?token=${token}`;

    // Email setup (adjust as needed)
    const transporter = nodemailer.createTransport({
      service: "gmail", // or custom SMTP if using your own domain
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    const mailOptions = {
      from: `"Select Anchors" <${process.env.SMTP_USER}>`,
      to: user.email,
      subject: "Password Reset Request",
      html: `
        <p>You requested a password reset for your Select Anchors account.</p>
        <p>Click the button below to set a new password. This link expires in 30 minutes.</p>
        <p><a href="${resetLink}" style="background:#2f4f4f;color:white;padding:10px 20px;border-radius:6px;text-decoration:none;">Reset Password</a></p>
        <p>If you didn’t request this, you can safely ignore this email.</p>
      `,
    };

    await transporter.sendMail(mailOptions);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
