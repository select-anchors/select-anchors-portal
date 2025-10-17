// app/api/wells/route.js
import { NextResponse } from "next/server";
import { q } from "@/lib/db";

// ✅ GET - List all wells
export async function GET() {
  try {
    const wells = await q(`
      SELECT 
        w.id,
        w.api,
        w.company_man_name,
        w.company_man_email,
        w.company_man_phone,
        w.company_name,
        w.company_email,
        w.company_phone,
        w.company_address,
        w.gps_anchor_1,
        w.gps_anchor_2,
        w.gps_anchor_3,
        w.gps_anchor_4,
        w.previous_anchor_company,
        w.last_test_date,
        w.expiration_date,
        w.notes,
        w.approved,
        w.created_at
      FROM wells w
      ORDER BY w.created_at DESC
    `);
    return NextResponse.json({ wells: wells.rows });
  } catch (err) {
    console.error("GET wells error:", err);
    return NextResponse.json({ error: "Failed to fetch wells" }, { status: 500 });
  }
}

// ✅ POST - Create a new well
export async function POST(req) {
  try {
    const data = await req.json();
    const {
      api,
      company_man_name,
      company_man_email,
      company_man_phone,
      company_name,
      company_email,
      company_phone,
      company_address,
      gps_anchor_1,
      gps_anchor_2,
      gps_anchor_3,
      gps_anchor_4,
      previous_anchor_company,
      last_test_date,
      expiration_date,
      notes
    } = data;

    await q(
      `
      INSERT INTO wells (
        api,
        company_man_name,
        company_man_email,
        company_man_phone,
        company_name,
        company_email,
        company_phone,
        company_address,
        gps_anchor_1,
        gps_anchor_2,
        gps_anchor_3,
        gps_anchor_4,
        previous_anchor_company,
        last_test_date,
        expiration_date,
        notes,
        approved
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, FALSE
      )
      `,
      [
        api,
        company_man_name,
        company_man_email,
        company_man_phone,
        company_name,
        company_email,
        company_phone,
        company_address,
        gps_anchor_1,
        gps_anchor_2,
        gps_anchor_3,
        gps_anchor_4,
        previous_anchor_company,
        last_test_date,
        expiration_date,
        notes
      ]
    );

    return NextResponse.json({ message: "Well submitted for approval" }, { status: 201 });
  } catch (err) {
    console.error("POST wells error:", err);
    return NextResponse.json({ error: "Failed to create well" }, { status: 500 });
  }
}

// ✅ PATCH - Approve or update a well
export async function PATCH(req) {
  try {
    const data = await req.json();
    const {
      id,
      api,
      company_man_name,
      company_man_email,
      company_man_phone,
      company_name,
      company_email,
      company_phone,
      company_address,
      gps_anchor_1,
      gps_anchor_2,
      gps_anchor_3,
      gps_anchor_4,
      previous_anchor_company,
      last_test_date,
      expiration_date,
      notes,
      approved
    } = data;

    await q(
      `
      UPDATE wells SET
        api = $2,
        company_man_name = $3,
        company_man_email = $4,
        company_man_phone = $5,
        company_name = $6,
        company_email = $7,
        company_phone = $8,
        company_address = $9,
        gps_anchor_1 = $10,
        gps_anchor_2 = $11,
        gps_anchor_3 = $12,
        gps_anchor_4 = $13,
        previous_anchor_company = $14,
        last_test_date = $15,
        expiration_date = $16,
        notes = $17,
        approved = $18
      WHERE id = $1
      `,
      [
        id,
        api,
        company_man_name,
        company_man_email,
        company_man_phone,
        company_name,
        company_email,
        company_phone,
        company_address,
        gps_anchor_1,
        gps_anchor_2,
        gps_anchor_3,
        gps_anchor_4,
        previous_anchor_company,
        last_test_date,
        expiration_date,
        notes,
        approved
      ]
    );

    return NextResponse.json({ message: "Well updated successfully" });
  } catch (err) {
    console.error("PATCH wells error:", err);
    return NextResponse.json({ error: "Failed to update well" }, { status: 500 });
  }
}

// ✅ DELETE - Remove a well
export async function DELETE(req) {
  try {
    const { id } = await req.json();
    await q(`DELETE FROM wells WHERE id = $1`, [id]);
    return NextResponse.json({ message: "Well deleted successfully" });
  } catch (err) {
    console.error("DELETE wells error:", err);
    return NextResponse.json({ error: "Failed to delete well" }, { status: 500 });
  }
}
