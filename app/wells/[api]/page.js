export default async function WellDetail({ params }) {
  const { api } = params;
  const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/wells/${api}`);
  const well = await res.json();

  return (
    <div>
      <h1>Well: {well.lease_name}</h1>
      {/* Render well details here */}
    </div>
  );
}
