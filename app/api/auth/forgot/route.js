// app/api/auth/forgot/route.js
import { q } from "@/lib/db";
import crypto from "crypto";
import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT || 587),
  secure: Number(process.env.SMTP_PORT) === 465, // true for 465, false for other ports
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
});

export async function POST(req) {
  const { email } = await req.json();
  if (!email) return new Response(JSON.stringify({ error: "Email required" }), { status: 400 });

  const token = crypto.randomBytes(32).toString("hex");
  const expires = new Date(Date.now() + 1000 * 60 * 60).toISOString(); // 1 hour

  try {
    const { rows } = await q(
      `UPDATE users SET reset_token = $1, reset_expires = $2 WHERE email = $3 RETURNING id, email`,
      [token, expires, email.toLowerCase()]
    );

    if (!rows?.length) {
      // For security, return success even if the email doesn't exist
      return new Response(JSON.stringify({ ok: true }));
    }

    const resetUrl = `${process.env.NEXT_PUBLIC_BASE_URL || ""}/reset?token=${token}&email=${encodeURIComponent(email)}`;

    await transporter.sendMail({
      from: process.env.SMTP_FROM,
      to: email,
      subject: "Select Anchors — Password reset",
      text: `Reset your password: ${resetUrl}`,
      html: `<p>Reset your password: <a href="${resetUrl}">${resetUrl}</a></p>`
    });

    return new Response(JSON.stringify({ ok: true }));
  } catch (err) {
    console.error(err);
    return new Response(JSON.stringify({ error: "Server error" }), { status: 500 });
  }
}
