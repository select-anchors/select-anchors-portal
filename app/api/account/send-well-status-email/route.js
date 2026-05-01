// app/api/account/send-well-status-email/route.js
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import nodemailer from "nodemailer";
import { authOptions } from "../../../../lib/nextauth-options";
import { q } from "../../../../lib/db";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function escapeHtml(v) {
  return String(v ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function fmtDate(d) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-US");
}

function requestTestLink(appUrl, w) {
  const params = new URLSearchParams({
    api: w.api || "",
    lease_well_name: w.lease_well_name || "",
    company_name: w.company_name || "",
    state: w.state || "",
    county: w.county || "",
  });

  return `${appUrl}/jobs/new?${params.toString()}`;
}

function buildRows(wells, appUrl) {
  if (!wells.length) {
    return `<p style="color:#6b7280;">None right now.</p>`;
  }

  return `
    <table style="width:100%;border-collapse:collapse;font-size:14px;">
      <thead>
        <tr style="background:#f3f4f6;text-align:left;">
          <th style="padding:10px;">Lease / Well</th>
          <th style="padding:10px;">API</th>
          <th style="padding:10px;">County</th>
          <th style="padding:10px;">Expires</th>
          <th style="padding:10px;">Action</th>
        </tr>
      </thead>
      <tbody>
        ${wells
          .map(
            (w) => `
              <tr>
                <td style="padding:10px;border-bottom:1px solid #e5e7eb;">
                  ${escapeHtml(w.lease_well_name || "—")}
                </td>
                <td style="padding:10px;border-bottom:1px solid #e5e7eb;font-family:monospace;">
                  ${escapeHtml(w.api || "—")}
                </td>
                <td style="padding:10px;border-bottom:1px solid #e5e7eb;">
                  ${escapeHtml(w.county || "—")}
                </td>
                <td style="padding:10px;border-bottom:1px solid #e5e7eb;">
                  ${escapeHtml(fmtDate(w.current_expires_at))}
                </td>
                <td style="padding:10px;border-bottom:1px solid #e5e7eb;">
                  <a href="${requestTestLink(appUrl, w)}" style="color:#2f4f4f;font-weight:bold;">
                    Request Test
                  </a>
                </td>
              </tr>
            `
          )
          .join("")}
      </tbody>
    </table>
  `;
}

function buildEmail({ user, expired, expiring, appUrl }) {
  const allApis = [...expired, ...expiring].map((w) => w.api).filter(Boolean);
  const bulkLink =
    allApis.length > 0
      ? `${appUrl}/jobs/new?apis=${encodeURIComponent(allApis.join(","))}`
      : `${appUrl}/wells`;

  return `
    <div style="font-family:Arial,sans-serif;background:#f8fafc;padding:24px;color:#111827;">
      <div style="max-width:800px;margin:0 auto;background:white;border:1px solid #e5e7eb;border-radius:16px;overflow:hidden;">
        <div style="background:#2f4f4f;color:white;padding:24px;">
          <h1 style="margin:0;">Select Anchors</h1>
          <p style="margin:8px 0 0;">Current Well Status Summary</p>
        </div>

        <div style="padding:24px;">
          <p>Hi ${escapeHtml(user.name || "there")},</p>

          <p>
            Here is the current status for
            <strong>${escapeHtml(user.company_name || "your company")}</strong>.
          </p>

          <div style="margin:20px 0;">
            <a href="${bulkLink}"
              style="display:inline-block;background:#2f4f4f;color:white;text-decoration:none;padding:12px 18px;border-radius:10px;font-weight:bold;">
              Request Bulk Test
            </a>
          </div>

          <h2 style="color:#991b1b;">Expired Wells (${expired.length})</h2>
          ${buildRows(expired, appUrl)}

          <h2 style="color:#92400e;margin-top:32px;">Expiring Soon — Next 90 Days (${expiring.length})</h2>
          ${buildRows(expiring, appUrl)}

          <p style="font-size:12px;color:#6b7280;margin-top:28px;">
            This email was manually requested from your Select Anchors account.
          </p>
        </div>
      </div>
    </div>
  `;
}

export async function POST() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const companyId = session.user.company_id;

  if (!companyId) {
    return NextResponse.json(
      { error: "Your account is not assigned to a company." },
      { status: 400 }
    );
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

  const { rows: expired } = await q(
    `
    SELECT api, lease_well_name, company_name, county, state, current_expires_at
    FROM wells
    WHERE company_id = $1
      AND current_expires_at IS NOT NULL
      AND current_expires_at < CURRENT_DATE
    ORDER BY current_expires_at ASC, lease_well_name ASC
    `,
    [companyId]
  );

  const { rows: expiring } = await q(
    `
    SELECT api, lease_well_name, company_name, county, state, current_expires_at
    FROM wells
    WHERE company_id = $1
      AND current_expires_at IS NOT NULL
      AND current_expires_at >= CURRENT_DATE
      AND current_expires_at <= CURRENT_DATE + INTERVAL '90 days'
    ORDER BY current_expires_at ASC, lease_well_name ASC
    `,
    [companyId]
  );

  const transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: Number(SMTP_PORT),
    secure: Number(SMTP_PORT) === 465,
    auth: {
      user: SMTP_USER,
      pass: SMTP_PASS,
    },
  });

  await transporter.sendMail({
    from: SMTP_FROM,
    to: session.user.email,
    subject: `Select Anchors Well Status: ${expired.length} expired, ${expiring.length} expiring soon`,
    html: buildEmail({
      user: session.user,
      expired,
      expiring,
      appUrl,
    }),
  });

  return NextResponse.json({
    ok: true,
    expired: expired.length,
    expiring: expiring.length,
  });
}
