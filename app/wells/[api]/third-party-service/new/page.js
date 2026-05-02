// app/wells/[api]/third-party-service/new/page.js
"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import NotLoggedIn from "../../../../components/NotLoggedIn";

function FileUploadBox({ label, fileType, value, onUploaded, required = false }) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  async function uploadFile(file) {
    if (!file) return;

    setUploading(true);
    setError("");

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("file_type", fileType);

      const res = await fetch("/api/uploads/service-file", {
        method: "POST",
        body: formData,
      });

      const json = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(json?.error || "Upload failed.");
      }

      onUploaded(json);
    } catch (err) {
      setError(err?.message || "Upload failed.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="rounded-xl border bg-white p-4 space-y-2">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="font-medium text-sm">
            {label} {required ? <span className="text-red-600">*</span> : null}
          </div>
          <div className="text-xs text-gray-500">PDF, JPG, PNG, or WEBP up to 15MB</div>
        </div>

        {value?.file_url ? (
          <a
            href={value.file_url}
            target="_blank"
            rel="noreferrer"
            className="text-sm underline text-[#2f4f4f]"
          >
            View
          </a>
        ) : null}
      </div>

      <input
        type="file"
        accept="application/pdf,image/jpeg,image/png,image/webp"
        disabled={uploading}
        onChange={(e) => uploadFile(e.target.files?.[0])}
        className="block w-full text-sm"
      />

      {uploading ? <div className="text-xs text-gray-500">Uploading…</div> : null}

      {value?.file_name ? (
        <div className="text-xs text-green-700">
          Uploaded: {value.file_name}
        </div>
      ) : null}

      {error ? <div className="text-xs text-red-600">{error}</div> : null}
    </div>
  );
}

export default function SubmitThirdPartyServicePage({ params }) {
  const { data: session, status } = useSession();
  const router = useRouter();

  const api = useMemo(
    () => (params?.api ? decodeURIComponent(params.api) : ""),
    [params]
  );

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    service_date: "",
    service_type: "third_party_test",
    third_party_company_name: "",
    current_expires_at: "",
    chart_recorder_file_url: "",
    jsa_file_url: "",
    one_call_file_url: "",
    chart_recorder_file: null,
    jsa_file: null,
    one_call_file: null,
    notes: "",
    responsibility_acknowledged: false,
  });

  function upd(key, value) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function submit(e) {
    e.preventDefault();
    setSaving(true);
    setError("");

    try {
      if (!form.chart_recorder_file_url) {
        throw new Error("Chart recorder upload is required.");
      }

      const res = await fetch(
        `/api/wells/${encodeURIComponent(api)}/third-party-service`,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            service_date: form.service_date,
            service_type: form.service_type,
            third_party_company_name: form.third_party_company_name,
            current_expires_at: form.current_expires_at,
            chart_recorder_file_url: form.chart_recorder_file_url,
            jsa_file_url: form.jsa_file_url,
            one_call_file_url: form.one_call_file_url,
            chart_recorder_file: form.chart_recorder_file,
            jsa_file: form.jsa_file,
            one_call_file: form.one_call_file,
            notes: form.notes,
            responsibility_acknowledged: form.responsibility_acknowledged,
          }),
        }
      );

      const json = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(json?.error || "Failed to submit third-party service.");
      }

      alert("Third-party service submitted for Select Anchors review.");
      router.push(`/wells/${encodeURIComponent(api)}`);
    } catch (err) {
      setError(err?.message || "Failed to submit third-party service.");
    } finally {
      setSaving(false);
    }
  }

  if (status === "loading") return <div className="container py-8">Loading…</div>;
  if (!session) return <NotLoggedIn />;

  return (
    <div className="container py-8 max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Submit Third-Party Service</h1>
        <p className="text-sm text-gray-600 mt-1">
          API: <span className="font-mono">{api}</span>
        </p>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <form onSubmit={submit} className="bg-white border rounded-2xl p-6 space-y-5">
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Service Date</label>
            <input
              type="date"
              required
              className="w-full border rounded-xl px-3 py-2"
              value={form.service_date}
              onChange={(e) => upd("service_date", e.target.value)}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Service Type</label>
            <select
              className="w-full border rounded-xl px-3 py-2"
              value={form.service_type}
              onChange={(e) => upd("service_type", e.target.value)}
            >
              <option value="third_party_test">Third-Party Test</option>
              <option value="third_party_install_test">Third-Party Install & Test</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">
            Third-Party Company Name
          </label>
          <input
            required
            className="w-full border rounded-xl px-3 py-2"
            value={form.third_party_company_name}
            onChange={(e) => upd("third_party_company_name", e.target.value)}
            placeholder="Example: ABC Anchor Service"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">
            New Expiration Date
          </label>
          <input
            type="date"
            required
            className="w-full border rounded-xl px-3 py-2"
            value={form.current_expires_at}
            onChange={(e) => upd("current_expires_at", e.target.value)}
          />
        </div>

        <div className="rounded-2xl border bg-gray-50 p-4 space-y-4">
          <div>
            <h2 className="font-semibold">Documentation Uploads</h2>
            <p className="text-sm text-gray-600">
              Upload the supporting records for this third-party service.
            </p>
          </div>

          <FileUploadBox
            label="Chart Recorder"
            fileType="chart_recorder"
            required
            value={form.chart_recorder_file}
            onUploaded={(file) => {
              upd("chart_recorder_file", file);
              upd("chart_recorder_file_url", file.file_url);
            }}
          />

          <FileUploadBox
            label="JSA"
            fileType="jsa"
            value={form.jsa_file}
            onUploaded={(file) => {
              upd("jsa_file", file);
              upd("jsa_file_url", file.file_url);
            }}
          />

          <FileUploadBox
            label="811 / One-Call Confirmation"
            fileType="one_call"
            value={form.one_call_file}
            onUploaded={(file) => {
              upd("one_call_file", file);
              upd("one_call_file_url", file.file_url);
            }}
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Notes</label>
          <textarea
            className="w-full border rounded-xl px-3 py-2"
            rows={4}
            value={form.notes}
            onChange={(e) => upd("notes", e.target.value)}
          />
        </div>

        <label className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm">
          <input
            type="checkbox"
            className="mt-1"
            checked={form.responsibility_acknowledged}
            onChange={(e) => upd("responsibility_acknowledged", e.target.checked)}
            required
          />
          <span>
            I certify that this service record and uploaded documentation are accurate
            to the best of my knowledge. I understand that Select Anchors did not
            perform or certify this third-party work and is not responsible for the
            accuracy, safety, or results of that service.
          </span>
        </label>

        <div className="flex gap-3">
          <button
            type="submit"
            disabled={saving}
            className="px-4 py-2 rounded-xl bg-[#2f4f4f] text-white hover:opacity-90 disabled:opacity-60"
          >
            {saving ? "Submitting…" : "Submit for Review"}
          </button>

          <button
            type="button"
            onClick={() => router.back()}
            className="px-4 py-2 rounded-xl border hover:bg-gray-50"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
