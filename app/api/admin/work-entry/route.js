// app/api/admin/work-entry/route.js

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../../../lib/nextauth-options";
import { q } from "../../../../lib/db";
import { hasPermission } from "../../../../lib/permissions";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function noStoreJson(data, init = {}) {
  const response = NextResponse.json(data, init);

  response.headers.set(
    "Cache-Control",
    "no-store, no-cache, must-revalidate, proxy-revalidate"
  );
  response.headers.set("Pragma", "no-cache");
  response.headers.set("Expires", "0");

  return response;
}

function cleanText(value) {
  const text = String(value ?? "").trim();
  return text || null;
}

function normalizeName(value) {
  return String(value ?? "")
    .trim()
    .replace(/\s+/g, " ");
}

function normalizeApi(value) {
  return String(value ?? "").trim();
}

function normalizeNumber(value) {
  if (value === "" || value === null || value === undefined) {
    return null;
  }

  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function addYears(dateString, years = 2) {
  if (!dateString) return null;

  const date = new Date(`${dateString}T00:00:00`);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  date.setFullYear(date.getFullYear() + years);

  return date.toISOString().slice(0, 10);
}

function makeCoords(latitudeValue, longitudeValue) {
  const latitude = normalizeNumber(latitudeValue);
  const longitude = normalizeNumber(longitudeValue);

  if (latitude === null || longitude === null) {
    return null;
  }

  return `${latitude}, ${longitude}`;
}

function normalizePassFail(value) {
  const status = String(value || "not_tested")
    .trim()
    .toLowerCase();

  if (["pass", "fail", "not_tested"].includes(status)) {
    return status;
  }

  return "not_tested";
}

function normalizeServiceType(value) {
  const type = String(value || "test")
    .trim()
    .toLowerCase();

  if (["test", "install_test", "install"].includes(type)) {
    return type;
  }

  return "test";
}

function isTestService(serviceType) {
  return serviceType === "test" || serviceType === "install_test";
}

function valueFromWellOrBatch(wellValue, batchValue) {
  const cleanedWellValue = cleanText(wellValue);

  if (cleanedWellValue !== null) {
    return cleanedWellValue;
  }

  return cleanText(batchValue);
}

async function resolveCompany({
  companyId,
  name,
  email,
  phone,
  address,
}) {
  const cleanCompanyId = cleanText(companyId);
  const companyName = normalizeName(name);

  if (cleanCompanyId) {
    const existing = await q(
      `
      SELECT id, name, email, phone, address
      FROM companies
      WHERE id = $1
      LIMIT 1
      `,
      [cleanCompanyId]
    );

    if (existing.rows[0]) {
      const updated = await q(
        `
        UPDATE companies
        SET
          name = COALESCE($1, name),
          normalized_name = COALESCE($2, normalized_name),
          email = COALESCE($3, email),
          phone = COALESCE($4, phone),
          address = COALESCE($5, address),
          updated_at = NOW()
        WHERE id = $6
        RETURNING id, name, email, phone, address
        `,
        [
          cleanText(companyName),
          companyName ? companyName.toLowerCase() : null,
          cleanText(email),
          cleanText(phone),
          cleanText(address),
          cleanCompanyId,
        ]
      );

      return updated.rows[0];
    }
  }

  if (!companyName) {
    throw new Error("Every well must have a company.");
  }

  const normalizedName = companyName.toLowerCase();

  const existingByName = await q(
    `
    SELECT id, name, email, phone, address
    FROM companies
    WHERE normalized_name = $1
       OR LOWER(name) = $1
    LIMIT 1
    `,
    [normalizedName]
  );

  if (existingByName.rows[0]) {
    const updated = await q(
      `
      UPDATE companies
      SET
        email = COALESCE($1, email),
        phone = COALESCE($2, phone),
        address = COALESCE($3, address),
        updated_at = NOW()
      WHERE id = $4
      RETURNING id, name, email, phone, address
      `,
      [
        cleanText(email),
        cleanText(phone),
        cleanText(address),
        existingByName.rows[0].id,
      ]
    );

    return updated.rows[0];
  }

  const inserted = await q(
    `
    INSERT INTO companies (
      name,
      normalized_name,
      email,
      phone,
      address,
      permissions_json,
      is_active,
      created_at,
      updated_at
    )
    VALUES (
      $1,
      $2,
      $3,
      $4,
      $5,
      '{}'::jsonb,
      TRUE,
      NOW(),
      NOW()
    )
    RETURNING id, name, email, phone, address
    `,
    [
      companyName,
      normalizedName,
      cleanText(email),
      cleanText(phone),
      cleanText(address),
    ]
  );

  return inserted.rows[0];
}

async function resolveCompanyContact({
  contactId,
  companyId,
  name,
  email,
  phone,
}) {
  const cleanContactId = cleanText(contactId);
  const contactName = normalizeName(name);

  if (!contactName && !cleanContactId) {
    return null;
  }

  if (cleanContactId) {
    const existing = await q(
      `
      SELECT id, company_id, name, email, phone
      FROM company_contacts
      WHERE id = $1
        AND company_id = $2
      LIMIT 1
      `,
      [cleanContactId, companyId]
    );

    if (existing.rows[0]) {
      const updated = await q(
        `
        UPDATE company_contacts
        SET
          name = COALESCE($1, name),
          normalized_name = COALESCE($2, normalized_name),
          email = COALESCE($3, email),
          phone = COALESCE($4, phone),
          updated_at = NOW()
        WHERE id = $5
        RETURNING id, company_id, name, email, phone
        `,
        [
          cleanText(contactName),
          contactName ? contactName.toLowerCase() : null,
          cleanText(email),
          cleanText(phone),
          cleanContactId,
        ]
      );

      return updated.rows[0];
    }
  }

  if (!contactName) {
    return null;
  }

  const normalizedName = contactName.toLowerCase();

  const existingByDetails = await q(
    `
    SELECT id, company_id, name, email, phone
    FROM company_contacts
    WHERE company_id = $1
      AND normalized_name = $2
      AND COALESCE(LOWER(email), '') = COALESCE(LOWER($3), '')
      AND COALESCE(phone, '') = COALESCE($4, '')
    LIMIT 1
    `,
    [
      companyId,
      normalizedName,
      cleanText(email),
      cleanText(phone),
    ]
  );

  if (existingByDetails.rows[0]) {
    return existingByDetails.rows[0];
  }

  const inserted = await q(
    `
    INSERT INTO company_contacts (
      company_id,
      name,
      normalized_name,
      email,
      phone,
      contact_type,
      is_active,
      created_at,
      updated_at
    )
    VALUES (
      $1,
      $2,
      $3,
      $4,
      $5,
      'company_man',
      TRUE,
      NOW(),
      NOW()
    )
    RETURNING id, company_id, name, email, phone
    `,
    [
      companyId,
      contactName,
      normalizedName,
      cleanText(email),
      cleanText(phone),
    ]
  );

  return inserted.rows[0];
}

export async function POST(request) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return noStoreJson({ error: "Unauthorized" }, { status: 401 });
  }

  const canUse =
    session.user.role === "admin" ||
    hasPermission(session, "can_edit_wells") ||
    hasPermission(session, "can_view_all_wells");

  if (!canUse) {
    return noStoreJson({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const body = await request.json();
    const wells = Array.isArray(body.wells) ? body.wells : [];

    if (!wells.length) {
      return noStoreJson(
        { error: "At least one well is required." },
        { status: 400 }
      );
    }

    let createdWells = 0;
    let updatedWells = 0;
    let servicesCreated = 0;
    let testsCreated = 0;
    let anchorRowsCreated = 0;

    await q("BEGIN");

    for (const rawWell of wells) {
      const api = normalizeApi(rawWell.api);

      if (!api) {
        throw new Error("Every well must have an API.");
      }

      const serviceType = normalizeServiceType(
        valueFromWellOrBatch(rawWell.service_type, body.service_type)
      );

      const serviceDate = valueFromWellOrBatch(
        rawWell.service_date,
        body.service_date
      );

      if (!serviceDate) {
        throw new Error(`A service date is required for API ${api}.`);
      }

      const technicianName = valueFromWellOrBatch(
        rawWell.technician_name,
        body.technician_name
      );

      const company = await resolveCompany({
        companyId:
          cleanText(rawWell.company_id) ||
          cleanText(body.company_id),

        name: valueFromWellOrBatch(
          rawWell.company_name,
          body.company_name
        ),

        email: valueFromWellOrBatch(
          rawWell.company_email,
          body.company_email
        ),

        phone: valueFromWellOrBatch(
          rawWell.company_phone,
          body.company_phone
        ),

        address: valueFromWellOrBatch(
          rawWell.company_address,
          body.company_address
        ),
      });

      const companyContact = await resolveCompanyContact({
        contactId:
          cleanText(rawWell.company_contact_id) ||
          cleanText(body.company_contact_id),

        companyId: company.id,

        name: valueFromWellOrBatch(
          rawWell.company_man_name,
          body.company_man_name
        ),

        email: valueFromWellOrBatch(
          rawWell.company_man_email,
          body.company_man_email
        ),

        phone: valueFromWellOrBatch(
          rawWell.company_man_phone,
          body.company_man_phone
        ),
      });

      const county = valueFromWellOrBatch(
        rawWell.county,
        body.county
      );

      const state =
        valueFromWellOrBatch(rawWell.state, body.state) || "NM";

      const previousAnchorCompany = valueFromWellOrBatch(
        rawWell.previous_anchor_company,
        body.previous_anchor_company
      );

      const previousAnchorWork = valueFromWellOrBatch(
        rawWell.previous_anchor_work,
        body.previous_anchor_work
      );

      const notes = valueFromWellOrBatch(
        rawWell.notes,
        body.notes
      );

      const latitude = normalizeNumber(rawWell.latitude);
      const longitude = normalizeNumber(rawWell.longitude);

      const wellheadCoords = makeCoords(
        rawWell.latitude,
        rawWell.longitude
      );

      const testedService = isTestService(serviceType);

      const expirationDate = testedService
        ? addYears(serviceDate, 2)
        : null;

      const existingWell = await q(
        `
        SELECT id, api
        FROM wells
        WHERE api = $1
        LIMIT 1
        `,
        [api]
      );

      let wellId;

      if (existingWell.rows[0]) {
        wellId = existingWell.rows[0].id;
        updatedWells += 1;

        await q(
          `
          UPDATE wells
          SET
            customer = $1,
            customer_id = $2,
            company_id = $2,
            company_name = $3,
            company_email = $4,
            company_phone = $5,
            company_address = $6,

            company_man_name = $7,
            company_man_email = $8,
            company_man_phone = $9,

            county = COALESCE($10, county),
            state = COALESCE($11, state),
            lease_well_name = COALESCE($12, lease_well_name),

            previous_anchor_company =
              COALESCE($13, previous_anchor_company),

            previous_anchor_work =
              COALESCE($14, previous_anchor_work),

            directions_other_notes =
              COALESCE($15, directions_other_notes),

            wellhead_coords =
              COALESCE($16, wellhead_coords),

            latitude =
              COALESCE($17, latitude),

            longitude =
              COALESCE($18, longitude),

            current_tested_at =
              CASE
                WHEN $19 = TRUE THEN $20
                ELSE current_tested_at
              END,

            current_expires_at =
              CASE
                WHEN $19 = TRUE THEN $21
                ELSE current_expires_at
              END,

            status = 'Active',
            updated_at = NOW()
          WHERE id = $22
          `,
          [
            company.name,
            company.id,
            company.name,
            company.email,
            company.phone,
            company.address,

            companyContact?.name || null,
            companyContact?.email || null,
            companyContact?.phone || null,

            county,
            state,
            cleanText(rawWell.lease_well_name),

            previousAnchorCompany,
            previousAnchorWork,
            cleanText(rawWell.directions_other_notes),

            wellheadCoords,
            latitude,
            longitude,

            testedService,
            serviceDate,
            expirationDate,

            wellId,
          ]
        );
      } else {
        const insertedWell = await q(
          `
          INSERT INTO wells (
            api,
            customer,
            customer_id,
            company_id,
            company_name,
            company_email,
            company_phone,
            company_address,

            company_man_name,
            company_man_email,
            company_man_phone,

            county,
            state,
            lease_well_name,

            previous_anchor_company,
            previous_anchor_work,
            directions_other_notes,

            wellhead_coords,
            latitude,
            longitude,

            current_tested_at,
            current_expires_at,

            status,
            is_approved,
            approved_at,
            approved_by,
            created_at,
            updated_at
          )
          VALUES (
            $1,
            $2,
            $3,
            $3,
            $4,
            $5,
            $6,
            $7,

            $8,
            $9,
            $10,

            $11,
            $12,
            $13,

            $14,
            $15,
            $16,

            $17,
            $18,
            $19,

            $20,
            $21,

            'Active',
            TRUE,
            NOW(),
            $22,
            NOW(),
            NOW()
          )
          RETURNING id
          `,
          [
            api,
            company.name,
            company.id,
            company.name,
            company.email,
            company.phone,
            company.address,

            companyContact?.name || null,
            companyContact?.email || null,
            companyContact?.phone || null,

            county,
            state,
            cleanText(rawWell.lease_well_name),

            previousAnchorCompany,
            previousAnchorWork,
            cleanText(rawWell.directions_other_notes),

            wellheadCoords,
            latitude,
            longitude,

            testedService ? serviceDate : null,
            testedService ? expirationDate : null,

            session.user.email ||
              session.user.name ||
              "Admin",
          ]
        );

        wellId = insertedWell.rows[0].id;
        createdWells += 1;
      }

      let testId = null;

      if (testedService) {
        const testInsert = await q(
          `
          INSERT INTO well_tests (
            well_api,
            tested_at,
            expires_at,
            tested_by_company,
            tested_by_user_id,
            notes,
            created_at,
            updated_at
          )
          VALUES (
            $1,
            $2,
            $3,
            $4,
            $5,
            $6,
            NOW(),
            NOW()
          )
          RETURNING id
          `,
          [
            api,
            serviceDate,
            expirationDate,
            cleanText(body.tested_by_company) ||
              "Select Anchors",
            session.user.id,
            notes,
          ]
        );

        testId = testInsert.rows[0]?.id || null;
        testsCreated += 1;

        if (testId) {
          await q(
            `
            UPDATE wells
            SET
              current_test_id = $1,
              current_tested_at = $2,
              current_expires_at = $3,
              updated_at = NOW()
            WHERE id = $4
            `,
            [
              testId,
              serviceDate,
              expirationDate,
              wellId,
            ]
          );
        }
      }

      const anchors = Array.isArray(rawWell.anchors)
        ? rawWell.anchors
        : [];

      const hasRedBagged = anchors.some(
        (anchor) => !!anchor.red_bagged
      );

      const hasNeedsNewAnchor = anchors.some(
        (anchor) =>
          !!anchor.needs_new_anchor ||
          !!anchor.red_bagged
      );

      const serviceInsert = await q(
        `
        INSERT INTO well_services (
          well_id,
          well_api,
          service_date,
          service_type,
          service_provider_type,
          tested_by_company,
          technician_name,
          notes,
          recommended_action,
          replacement_recommended,
          deactivated_any,
          review_status,
          tested_by_user_id,
          submitted_by_user_id,
          submitted_by_name,
          submitted_by_email,
          created_at,
          updated_at
        )
        VALUES (
          $1,
          $2,
          $3,
          $4,
          'select_anchors',
          $5,
          $6,
          $7,
          $8,
          $9,
          $10,
          'approved',
          $11,
          $11,
          $12,
          $13,
          NOW(),
          NOW()
        )
        RETURNING id
        `,
        [
          wellId,
          api,
          serviceDate,
          serviceType,

          cleanText(body.tested_by_company) ||
            "Select Anchors",

          technicianName,
          notes,

          hasRedBagged || hasNeedsNewAnchor
            ? "One or more anchors were red bagged. Start the new-anchor installation process."
            : null,

          hasNeedsNewAnchor,
          hasRedBagged,

          session.user.id,
          session.user.name || null,
          session.user.email || null,
        ]
      );

      const serviceId = serviceInsert.rows[0].id;
      servicesCreated += 1;

      for (const anchor of anchors) {
        const position = cleanText(anchor.anchor_position);

        if (!["NW", "NE", "SE", "SW"].includes(position)) {
          continue;
        }

        const inchesOut = normalizeNumber(
          anchor.inches_out_of_ground
        );

        const pullResult = normalizeNumber(
          anchor.pull_result_lbs
        );

        const passFail = normalizePassFail(
          anchor.pass_fail
        );

        const redBagged = !!anchor.red_bagged;

        const needsNewAnchor =
          !!anchor.needs_new_anchor ||
          redBagged;

        const anchorNotes = [
          redBagged ? "RED BAGGED." : null,
          needsNewAnchor
            ? "NEW ANCHOR INSTALLATION NEEDED."
            : null,
          cleanText(anchor.notes),
        ]
          .filter(Boolean)
          .join(" ");

        const hasAnchorData =
          inchesOut !== null ||
          pullResult !== null ||
          passFail !== "not_tested" ||
          redBagged ||
          needsNewAnchor ||
          !!anchorNotes;

        if (!hasAnchorData) {
          continue;
        }

        await q(
          `
          INSERT INTO well_service_anchors (
            well_service_id,
            anchor_position,
            inches_out_of_ground,
            pull_result_lbs,
            pass_fail,
            deactivated,
            replacement_required,
            notes,
            created_at,
            updated_at
          )
          VALUES (
            $1,
            $2,
            $3,
            $4,
            $5,
            $6,
            $7,
            $8,
            NOW(),
            NOW()
          )
          `,
          [
            serviceId,
            position,
            inchesOut,
            pullResult,
            redBagged ? "fail" : passFail,
            redBagged,
            needsNewAnchor,
            cleanText(anchorNotes),
          ]
        );

        anchorRowsCreated += 1;
      }
    }

    await q("COMMIT");

    return noStoreJson({
      ok: true,
      createdWells,
      updatedWells,
      servicesCreated,
      testsCreated,
      anchorRowsCreated,
    });
  } catch (error) {
    await q("ROLLBACK").catch(() => {});

    console.error("[ADMIN_WORK_ENTRY_ERROR]", error);

    return noStoreJson(
      {
        error:
          error?.message ||
          "Failed to save work entry.",
      },
      { status: 500 }
    );
  }
}
