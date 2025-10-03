export default function Home() {
  return (
    <main style={{ padding: "40px", textAlign: "center" }}>
      <h1>Select Anchors Portal</h1>
      <p>Welcome to the staging site. This will grow into your live dashboard.</p>

      <div style={{ marginTop: "30px" }}>
        <a
          href="/login"
          className="inline-block border border-gray-400 rounded-xl px-4 py-2 hover:bg-gray-50"
        >
          Login
        </a>
        <a
          href="/dashboard"
          className="inline-block ml-3 border border-gray-400 rounded-xl px-4 py-2 hover:bg-gray-50"
        >
          Go to Dashboard
        </a>
      </div>
    </main>
  );
}
