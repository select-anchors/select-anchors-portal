// app/admin/wells/import/page.js
"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import NotLoggedIn from "../../../components/NotLoggedIn";
import { hasPermission } from "../../../../lib/permissions";

function parseCsvLine(line) {
  const result = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    const next = line[i + 1];

    if (char === '"') {
      if (inQuotes && next === '"') {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === "," && !inQuotes) {
      result.push(current);
      current = "";
      continue;
    }

    current += char;
  }

  result.push(current);
  return result.map((v) => v.trim());
}

function parseCsv(text) {
  const lines = String(text || "")
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .split("\n")
    .filter((line) => line.trim() !== "");

  if (lines.length === 0) {
    return { headers: [], rows: [] };
  }

  const headers = parseCsvLine(lines[0]).map((h) => h.trim());

  const rows = lines.slice(1).map((line, index) => {
    const cols = parseCsvLine(line);
    const obj = {};

    headers.forEach((header, i) => {
      obj[header] = cols[i] ?? "";
    });

    obj.__row_number = index + 2;
    return obj;
  });

  return { headers, rows };
}

function normalizeHeaderKey(key) {
  return String(key || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_");
}

function mapRow(rawRow) {
  const row = {};
  Object.entries(rawRow || {}).forEach(([key, value]) => {
    row[normalizeHeaderKey(key)] = typeof value === "string" ? value.trim() : value;
  });

  return {
    api: row.api || "",
    lease_well_name: row.lease_well_name || row.lease_name || row.well_name || "",
    company_name: row.company_name || row.company || "",
    company_email: row.company_email || "",
    company_phone: row.company_phone || "",
    company_address: row.company_address || "",
    company_man_name: row.company_man_name || row.company_man || "",
    company_man_email: row.company_man_email || "",
    company_man_phone: row.company_man_phone || "",
    previous_anchor_company: row.previous_anchor_company || "",
    previous_anchor_work: row.previous_anchor_work || "",
    directions_other_notes: row.directions_other_notes || row.notes || "",
    wellhead_coords: row.wellhead_coords || row.coords || row.gps || "",
    state: row.state || "",
    county: row.county || "",
    status: row.status || "",
    __row_number: rawRow.__row_number,
  };
}

export default function AdminWellImportPage() {
  const { data: session, status } = useSession();

  const sessionReady = status === "authenticated" && !!session;
  const canViewAllWells =
    sessionReady && hasPermission(session, "can_view_all_wells");
  const canEditWells =
    sessionReady && hasPermission(session, "can_edit_wells");
  const canBulkEditWells =
    sessionReady && hasPermission(session, "can_bulk_edit_wells");

  const canUsePage = canViewAllWells && canEditWells && canBulkEditWells;

  const [fileName, setFileName] = useState("");
  const [csvText, setCsvText] = useState("");
  const [uploadError, setUploadError] = useState("");
  const [importError, setImportError] = useState("");
  const [importResult, setImportResult] = useState(null);
  const [importing, setImporting] = useState(false);

  const parsed = useMemo(() => parseCsv(csvText), [csvText]);

  const mappedRows = useMemo(() => {
    return (parsed.rows || []).map(mapRow);
  }, [parsed.rows]);

  const previewRows = useMemo(() => mappedRows.slice(0, 10), [mappedRows]);

  const requiredPreviewIssues = useMemo(() => {
    return mappedRows
      .filter((row) => !row.api || !row.lease_well_name)
      .slice(0, 10)
      .map((row) => ({
        row_number: row.__row_number,
        api: row.api || "",
        lease_well_name: row.lease_well_name || "",
      }));
  }, [mappedRows]);

  async function handleFileChange(e) {
    const file = e.target.files?.[0];
    setUploadError("");
    setImportError("");
    setImportResult(null);

    if (!file) {
      setFileName("");
      setCsvText("");
      return;
    }

    setFileName(file.name || "");

    try {
      const text = await file.text();
      setCsvText(text);
    } catch (err) {
      console.error("Failed to read CSV file:", err);
      setUploadError("Could not read that CSV file.");
      setCsvText("");
    }
  }

  async function handleImport() {
    setImportError("");
    setImportResult(null);

    if (mappedRows.length === 0) {
      setImportError("Please choose a CSV file first.");
      return;
    }

    try {
      setImporting(true);

      const res = await fetch("/api/admin/wells/import", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          rows: mappedRows,
        }),
      });

      const json = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(json?.error || "Import failed.");
      }

      setImportResult(json);
    } catch (err) {
      console.error("Import failed:", err);
      setImportError(err.message || "Import failed.");
    } finally {
      setImporting(false);
    }
  }

  if (status === "loading") {
    return <div className="container py-8">Loading…</div>;
  }

  if (!session) {
    return <NotLoggedIn />;
  }

  if (!canUsePage) {
    return <div className="container py-8">Not authorized.</div>;
  }

  return (
    <div className="container py-8 space-y-6 max-w-6xl">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold">Bulk Import Wells</h1>
          <p className="text-sm text-gray-600">
            Upload a CSV to add wells in bulk.
          </p>
        </div>

        <div className="flex gap-2">
          <Link
            href="/admin/wells"
            className="px-4 py-2 rounded-xl border border-gray-300 bg-white hover:bg-gray-50 text-sm"
          >
            Back to All Wells
          </Link>
        </div>
      </div>

      <div className="bg-white border rounded-2xl p-6 space-y-4">
        <h2 className="text-lg font-semibold">CSV Upload</h2>

        <div className="text-sm text-gray-600">
          Recommended columns:
          <div className="mt-2 font-mono text-xs bg-gray-50 border rounded-xl p-3 overflow-x-auto">
            api, lease_well_name, company_name, company_email, company_phone, company_address,
            company_man_name, company_man_email, company_man_phone, previous_anchor_company,
            previous_anchor_work, directions_other_notes, wellhead_coords, state, county, status
          </div>
        </div>

        <div>
          <input
            type="file"
            accept=".csv,text/csv"
            onChange={handleFileChange}
            className="block w-full text-sm"
          />
        </div>

        {fileName && (
          <div className="text-sm text-gray-600">
            Selected file: <span className="font-medium">{fileName}</span>
          </div>
        )}

        {uploadError && (
          <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-sm text-red-700">
            {uploadError}
          </div>
        )}
      </div>

      <div className="bg-white border rounded-2xl p-6 space-y-4">
        <h2 className="text-lg font-semibold">Preview</h2>

        <div className="text-sm text-gray-600">
          Parsed <span className="font-semibold">{mappedRows.length}</span> row
          {mappedRows.length === 1 ? "" : "s"}
        </div>

        {requiredPreviewIssues.length > 0 && (
          <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-sm text-amber-800">
            Some rows are missing required values. Each row needs at least:
            <span className="font-medium"> api</span> and{" "}
            <span className="font-medium">lease_well_name</span>.
            <div className="mt-2 space-y-1">
              {requiredPreviewIssues.map((item) => (
                <div key={item.row_number}>
                  Row {item.row_number}: API="{item.api || "—"}", Lease/Well="
                  {item.lease_well_name || "—"}"
                </div>
              ))}
            </div>
          </div>
        )}

        {previewRows.length === 0 ? (
          <div className="text-sm text-gray-600">No preview available yet.</div>
        ) : (
          <div className="overflow-auto border rounded-2xl">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-600">
                <tr>
                  <th className="text-left p-3">Row</th>
                  <th className="text-left p-3">API</th>
                  <th className="text-left p-3">Lease / Well</th>
                  <th className="text-left p-3">Company</th>
                  <th className="text-left p-3">County</th>
                  <th className="text-left p-3">State</th>
                </tr>
              </thead>
              <tbody>
                {previewRows.map((row) => (
                  <tr key={`${row.__row_number}-${row.api}`} className="border-t">
                    <td className="p-3">{row.__row_number}</td>
                    <td className="p-3 font-mono">{row.api || "—"}</td>
                    <td className="p-3">{row.lease_well_name || "—"}</td>
                    <td className="p-3">{row.company_name || "—"}</td>
                    <td className="p-3">{row.county || "—"}</td>
                    <td className="p-3">{row.state || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {mappedRows.length > 10 && (
          <div className="text-xs text-gray-500">
            Showing first 10 preview rows.
          </div>
        )}
      </div>

      <div className="flex gap-3">
        <button
          type="button"
          onClick={handleImport}
          disabled={importing || mappedRows.length === 0}
          className="px-4 py-2 rounded-xl bg-[#2f4f4f] text-white hover:opacity-90 disabled:opacity-60"
        >
          {importing ? "Importing…" : "Import Wells"}
        </button>

        <Link
          href="/admin/wells"
          className="px-4 py-2 rounded-xl border border-gray-300 bg-white hover:bg-gray-50"
        >
          Cancel
        </Link>
      </div>

      {importError && (
        <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-sm text-red-700">
          {importError}
        </div>
      )}

      {importResult && (
        <div className="bg-white border rounded-2xl p-6 space-y-4">
          <h2 className="text-lg font-semibold">Import Results</h2>

          <div className="grid md:grid-cols-4 gap-4">
            <div className="border rounded-xl p-4">
              <div className="text-xs text-gray-500 uppercase">Received</div>
              <div className="text-2xl font-semibold">
                {importResult.received_count ?? 0}
              </div>
            </div>

            <div className="border rounded-xl p-4">
              <div className="text-xs text-gray-500 uppercase">Inserted</div>
              <div className="text-2xl font-semibold">
                {importResult.inserted_count ?? 0}
              </div>
            </div>

            <div className="border rounded-xl p-4">
              <div className="text-xs text-gray-500 uppercase">Skipped Duplicates</div>
              <div className="text-2xl font-semibold">
                {importResult.duplicate_count ?? 0}
              </div>
            </div>

            <div className="border rounded-xl p-4">
              <div className="text-xs text-gray-500 uppercase">Invalid Rows</div>
              <div className="text-2xl font-semibold">
                {importResult.invalid_count ?? 0}
              </div>
            </div>
          </div>

          {Array.isArray(importResult.duplicates) && importResult.duplicates.length > 0 && (
            <div>
              <h3 className="font-medium mb-2">Duplicates Skipped</h3>
              <div className="text-sm text-gray-700 space-y-1">
                {importResult.duplicates.slice(0, 25).map((item, i) => (
                  <div key={`${item.api}-${i}`} className="font-mono">
                    {item.api}
                  </div>
                ))}
              </div>
            </div>
          )}

          {Array.isArray(importResult.invalid_rows) && importResult.invalid_rows.length > 0 && (
            <div>
              <h3 className="font-medium mb-2">Invalid Rows</h3>
              <div className="space-y-2">
                {importResult.invalid_rows.slice(0, 25).map((item, i) => (
                  <div key={`${item.row_number}-${i}`} className="rounded-xl border p-3 text-sm">
                    <div>
                      <span className="font-medium">Row {item.row_number}</span>
                      {" — "}
                      {item.reason}
                    </div>
                    <div className="text-gray-500 font-mono mt-1">
                      API: {item.api || "—"} | Lease/Well: {item.lease_well_name || "—"}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
