export default async function WellDetail({ params }) {
  const { api } = params;
  const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/wells/${api}`);
  const well = await res.json();
  
  return (
    <div>
      <h1>{well.lease_name}</h1>
      <p>Company: {well.company}</p>
      {/* render the rest of the well info */}
    </div>
  );
}
