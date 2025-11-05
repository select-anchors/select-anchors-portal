import nodemailer from "nodemailer";
import { q } from "@/lib/db";

export async function POST(req) {
  const { email } = await req.json();

  const token = crypto.randomUUID();
  const expires = new Date(Date.now() + 1000 * 60 * 60); // 1 hour

  await q(
    `UPDATE users SET reset_token=$1, reset_token_expires=$2 WHERE lower(email)=lower($3)`,
    [token, expires, email]
  );

  const resetUrl = `${process.env.NEXTAUTH_URL}/reset?token=${token}`;

  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT),
    secure: Number(process.env.SMTP_PORT) === 465, // true for 465, false for 587
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  await transporter.sendMail({
    from: process.env.EMAIL_FROM,
    to: email,
    subject: "Reset your Select Anchors password",
    text: `Click the link below to reset your password:\n\n${resetUrl}`,
    html: `<p>Click below to reset your password:</p><p><a href="${resetUrl}">${resetUrl}</a></p>`,
  });

  return Response.json({ ok: true });
}
