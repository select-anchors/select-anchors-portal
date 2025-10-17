// app/wells/[api]/page.js
export const dynamic = "force-dynamic";

async function getWell(api) {
  const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/wells/${encodeURIComponent(api)}`, {
    cache: "no-store",
  });
  if (!res.ok) return null;
  return res.json();
}

export default async function WellDetail({ params }) {
  const w = await getWell(params.api);
  if (!w) return <div className="container py-10">Well not found.</div>;

  return (
    <div className="container py-8 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">
          {w.lease_name || "Well"} • {w.api}
        </h1>
        <span
          className={
            "inline-flex px-2.5 py-1 rounded-xl text-xs font-semibold " +
            (w.status === "approved"
              ? "bg-emerald-100 text-emerald-700"
              : "bg-gray-200 text-gray-800")
          }
        >
          {w.status || "pending"}
        </span>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl border border-gray-200 p-6 space-y-2">
          <h2 className="font-semibold mb-2">Company</h2>
          <p><span className="text-gray-500">Name:</span> {w.company || "-"}</p>
          <p><span className="text-gray-500">Email:</span> {w.company_email || "-"}</p>
          <p><span className="text-gray-500">Phone:</span> {w.company_phone || "-"}</p>
          <p><span className="text-gray-500">Address:</span> {w.company_address || "-"}</p>
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 p-6 space-y-2">
          <h2 className="font-semibold mb-2">Company Man</h2>
          <p><span className="text-gray-500">Name:</span> {w.company_man_name || "-"}</p>
          <p><span className="text-gray-500">Email:</span> {w.company_man_email || "-"}</p>
          <p><span className="text-gray-500">Phone:</span> {w.company_man_phone || "-"}</p>
          <p><span className="text-gray-500">Last Test:</span> {w.last_test_date ? new Date(w.last_test_date).toLocaleDateString() : "-"}</p>
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 p-6 md:col-span-2 space-y-2">
          <h2 className="font-semibold mb-2">Previous Anchor Work</h2>
          <p className="whitespace-pre-wrap">{w.previous_anchor_work || "-"}</p>
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 p-6 md:col-span-2 space-y-2">
          <h2 className="font-semibold mb-2">Directions & Other Notes</h2>
          <p className="whitespace-pre-wrap">{w.notes_previous_manager || "-"}</p>
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 p-6 md:col-span-2 space-y-2">
          <h2 className="font-semibold mb-2">Anchor GPS</h2>
          <div className="grid md:grid-cols-4 gap-4 text-sm">
            <div>
              <div className="text-gray-500">#1</div>
              <div>{w.anchor1_lat || "-"}, {w.anchor1_lng || "-"}</div>
            </div>
            <div>
              <div className="text-gray-500">#2</div>
              <div>{w.anchor2_lat || "-"}, {w.anchor2_lng || "-"}</div>
            </div>
            <div>
              <div className="text-gray-500">#3</div>
              <div>{w.anchor3_lat || "-"}, {w.anchor3_lng || "-"}</div>
            </div>
            <div>
              <div className="text-gray-500">#4</div>
              <div>{w.anchor4_lat || "-"}, {w.anchor4_lng || "-"}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
