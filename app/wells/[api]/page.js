// app/wells/[api]/page.js
export const dynamic = "force-dynamic";

async function getWell(api) {
  const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/wells/${encodeURIComponent(api)}`, {
    cache: "no-store",
  });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error("Failed to load well");
  return res.json();
}

export default async function WellDetail({ params }) {
  const api = decodeURIComponent(params.api);
  const well = await getWell(api);

  if (!well) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <h1 className="text-xl font-semibold mb-2">Well not found.</h1>
        <p className="text-gray-500">API: {api}</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">{well.lease_well_name}</h1>
        <p className="text-gray-600">API: {well.api}</p>
        <p className="text-gray-600 capitalize">Status: {well.status}</p>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <h2 className="font-semibold">Company</h2>
          <p>{well.company_name}</p>
          <p>{well.company_address}</p>
          <p>{well.company_phone} • {well.company_email}</p>
        </div>

        <div className="space-y-2">
          <h2 className="font-semibold">Company Man</h2>
          <p>{well.company_man_name}</p>
          <p>{well.company_man_phone} • {well.company_man_email}</p>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <div>
          <h2 className="font-semibold mb-2">Anchor Coords</h2>
          <ul className="list-disc ml-5 space-y-1">
            <li>{well.anchor1_coords}</li>
            <li>{well.anchor2_coords}</li>
            <li>{well.anchor3_coords}</li>
            <li>{well.anchor4_coords}</li>
          </ul>
        </div>
        <div className="space-y-2">
          <h2 className="font-semibold">Dates</h2>
          <p>Last Test: {well.last_test_date ?? "-"}</p>
          <p>Expires: {well.expiration_date ?? "-"}</p>
          <p>Needed By: {well.need_by ?? "-"}</p>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <div>
          <h2 className="font-semibold mb-1">Previous Anchor Work</h2>
          <p className="whitespace-pre-wrap">{well.previous_anchor_work ?? "-"}</p>
          <p className="mt-2 text-sm text-gray-600">Prev Company: {well.previous_anchor_company ?? "-"}</p>
        </div>
        <div>
          <h2 className="font-semibold mb-1">Directions & Other Notes</h2>
          <p className="whitespace-pre-wrap">{well.directions_other_notes ?? "-"}</p>
        </div>
      </div>
    </div>
  );
}
