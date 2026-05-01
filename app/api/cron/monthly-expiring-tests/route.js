// app/api/cron/monthly-expiring-tests/route.js
import { NextResponse } from "next/server";
import nodemailer from "nodemailer";
import { q } from "../../../../lib/db";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function fmtDate(d) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function daysUntil(dateStr) {
  if (!dateStr) return null;
  const target = new Date(dateStr);
  const now = new Date();
  return Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function buildEmailHtml({ user, wells, appUrl }) {
  const rows = wells
    .map((w) => {
      const days = daysUntil(w.current_expires_at);
      const status =
        days === null ? "Unknown" : days < 0 ? `${Math.abs(days)} days overdue` : `${days} days left`;

      return `
        <tr>
          <td style="padding:10px;border-bottom:1px solid #e5e7eb;">${escapeHtml(w.lease_well_name || "—")}</td>
          <td style="padding:10px;border-bottom:1px solid #e5e7eb;font-family:monospace;">${escapeHtml(w.api || "—")}</td>
          <td style="padding:10px;border-bottom:1px solid #e5e7eb;">${escapeHtml(w.county || "—")}</td>
          <td style="padding:10px;border-bottom:1px solid #e5e7eb;">${escapeHtml(fmtDate(w.current_tested_at))}</td>
          <td style="padding:10px;border-bottom:1px solid #e5e7eb;">${escapeHtml(fmtDate(w.current_expires_at))}</td>
          <td style="padding:10px;border-bottom:1px solid #e5e7eb;">${escapeHtml(status)}</td>
        </tr>
      `;
    })
    .join("");

  return `
    <div style="font-family:Arial,sans-serif;background:#f8fafc;padding:24px;color:#111827;">
      <div style="max-width:760px;margin:0 auto;background:white;border:1px solid #e5e7eb;border-radius:16px;overflow:hidden;">
        <div style="background:#2f4f4f;color:white;padding:24px;">
          <h1 style="margin:0;font-size:24px;">Select Anchors</h1>
          <p style="margin:8px 0 0;">Monthly Expiring Tests Summary</p>
        </div>

        <div style="padding:24px;">
          <p style="font-size:16px;margin-top:0;">
            Hi ${escapeHtml(user.name || "there")},
          </p>

          <p style="font-size:15px;line-height:1.5;">
            You have <strong>${wells.length}</strong> well${wells.length === 1 ? "" : "s"} expiring or already expired within the next 90 days.
          </p>

          <p style="font-size:14px;color:#4b5563;">
            Company: <strong>${escapeHtml(user.company_name || "—")}</strong>
          </p>

          <table style="width:100%;border-collapse:collapse;margin-top:20px;font-size:14px;">
            <thead>
              <tr style="background:#f3f4f6;text-align:left;">
                <th style="padding:10px;">Lease / Well</th>
                <th style="padding:10px;">API</th>
                <th style="padding:10px;">County</th>
                <th style="padding:10px;">Last Test</th>
                <th style="padding:10px;">Expiration</th>
                <th style="padding:10px;">Status</th>
              </tr>
            </thead>
            <tbody>
              ${rows}
            </tbody>
          </table>

          <div style="margin-top:24px;">
            <a href="${appUrl}/wells"
              style="display:inline-block;background:#2f4f4f;color:white;text-decoration:none;padding:12px 18px;border-radius:10px;font-weight:bold;">
              View Wells
            </a>
          </div>

          <p style="font-size:12px;color:#6b7280;margin-top:24px;">
            You are receiving this because monthly expiring test reminders are enabled on your Select Anchors account.
          </p>
        </div>
      </div>
    </div>
  `;
}

function buildEmailText({ user, wells, appUrl }) {
  const lines = wells.map((w) => {
    const days = daysUntil(w.current_expires_at);
    const status =
      days === null ? "Unknown" : days < 0 ? `${Math.abs(days)} days overdue` : `${days} days left`;

    return `${w.lease_well_name || "—"} | ${w.api || "—"} | Expires: ${fmtDate(w.current_expires_at)} | ${status}`;
  });

  return `
Select Anchors - Monthly Expiring Tests Summary

Hi ${user.name || "there"},

You have ${wells.length} well${wells.length === 1 ? "" : "s"} expiring or already expired within the next 90 days.

Company: ${user.company_name || "—"}

${lines.join("\n")}

View Wells:
${appUrl}/wells
`;
}

export async function GET(req) {
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret) {
    const auth = req.headers.get("authorization") || "";
    if (auth !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const {
    SMTP_HOST,
    SMTP_PORT,
    SMTP_USER,
    SMTP_PASS,
    SMTP_FROM,
    NEXT_PUBLIC_APP_URL,
    NEXTAUTH_URL,
  } = process.env;

  if (!SMTP_HOST || !SMTP_PORT || !SMTP_USER || !SMTP_PASS || !SMTP_FROM) {
    return NextResponse.json(
      { error: "Missing SMTP environment variables." },
      { status: 500 }
    );
  }

  const appUrl = (NEXT_PUBLIC_APP_URL || NEXTAUTH_URL || "https://app.selectanchors.com").replace(/\/$/, "");

  const transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: Number(SMTP_PORT),
    secure: Number(SMTP_PORT) === 465,
    auth: {
      user: SMTP_USER,
      pass: SMTP_PASS,
    },
  });

  const { rows: users } = await q(
    `
    SELECT
      id,
      name,
      email,
      company_id,
      company_name
    FROM users
    WHERE COALESCE(is_active, TRUE) = TRUE
      AND monthly_expiring_summary_enabled = TRUE
      AND email IS NOT NULL
    ORDER BY company_name, email
    `
  );

  let sent = 0;
  let skipped = 0;
  const errors = [];

  for (const user of users) {
    try {
      if (!user.company_id) {
        skipped++;
        continue;
      }

      const { rows: wells } = await q(
        `
        SELECT
          api,
          lease_well_name,
          company_name,
          county,
          state,
          current_tested_at,
          current_expires_at
        FROM wells
        WHERE company_id = $1
          AND current_expires_at IS NOT NULL
          AND current_expires_at <= CURRENT_DATE + INTERVAL '90 days'
        ORDER BY current_expires_at ASC, lease_well_name ASC
        `,
        [user.company_id]
      );

      if (!wells.length) {
        skipped++;
        continue;
      }

      await transporter.sendMail({
        from: SMTP_FROM,
        to: user.email,
        subject: `Select Anchors: ${wells.length} expiring well test${wells.length === 1 ? "" : "s"}`,
        text: buildEmailText({ user, wells, appUrl }),
        html: buildEmailHtml({ user, wells, appUrl }),
      });

      await q(
        `
        UPDATE users
        SET monthly_expiring_summary_last_sent_at = NOW()
        WHERE id = $1
        `,
        [user.id]
      );

      sent++;
    } catch (err) {
      errors.push({
        user_id: user.id,
        email: user.email,
        error: err?.message || String(err),
      });
    }
  }

  return NextResponse.json({
    ok: true,
    checked_users: users.length,
    sent,
    skipped,
    errors,
  });
}
