// app/wells/[api]/third-party-service/new/page.js
"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import NotLoggedIn from "../../../../components/NotLoggedIn";

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
      const res = await fetch(
        `/api/wells/${encodeURIComponent(api)}/third-party-service`,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(form),
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

        <div className="rounded-2xl border bg-gray-50 p-4 space-y-3">
          <div>
            <h2 className="font-semibold">Documentation Links</h2>
            <p className="text-sm text-gray-600">
              For now, paste file URLs. Later we can replace this with true PDF/JPEG upload buttons.
            </p>
          </div>

          <input
            className="w-full border rounded-xl px-3 py-2"
            value={form.chart_recorder_file_url}
            onChange={(e) => upd("chart_recorder_file_url", e.target.value)}
            placeholder="Chart recorder file URL"
          />

          <input
            className="w-full border rounded-xl px-3 py-2"
            value={form.jsa_file_url}
            onChange={(e) => upd("jsa_file_url", e.target.value)}
            placeholder="JSA file URL"
          />

          <input
            className="w-full border rounded-xl px-3 py-2"
            value={form.one_call_file_url}
            onChange={(e) => upd("one_call_file_url", e.target.value)}
            placeholder="811 / One-call confirmation file URL"
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
