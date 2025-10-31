import { requireAdmin } from "@/lib/auth-helpers";
import { q } from "@/lib/db";
import crypto from "crypto";
import nodemailer from "nodemailer";

const tx = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT || 587),
  secure: Number(process.env.SMTP_PORT) === 465,
  auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
});

export async function POST(_req, { params }) {
  await requireAdmin();
  const id = params.id;

  const { rows } = await q(`SELECT email FROM users WHERE id=$1`, [id]);
  const email = rows[0]?.email;
  if (!email) return new Response(JSON.stringify({ error: "not found" }), { status: 404 });

  const token = crypto.randomBytes(32).toString("hex");
  const expires = new Date(Date.now() + 60 * 60 * 1000).toISOString(); // 1h
  await q(`UPDATE users SET reset_token=$1, reset_expires=$2 WHERE id=$3`, [token, expires, id]);

  const base = process.env.NEXT_PUBLIC_BASE_URL || "";
  const link = `${base}/reset?token=${token}&email=${encodeURIComponent(email)}`;

  await tx.sendMail({
    from: process.env.SMTP_FROM,
    to: email,
    subject: "Select Anchors — Password reset",
    text: `Reset your password: ${link}`,
    html: `<p>Reset your password: <a href="${link}">${link}</a></p>`
  });

  return new Response(JSON.stringify({ ok: true }));
}
