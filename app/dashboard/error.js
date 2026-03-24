// app/dashboard/error.js
"use client";

export default function GlobalError({ error, reset }) {
  console.error("App error boundary caught:", error);

  return (
    <div className="container py-10">
      <div className="bg-white border rounded-2xl p-6 space-y-4">
        <h1 className="text-xl font-semibold">Something went wrong</h1>
        <p className="text-sm text-gray-600">
          Please try again. If this keeps happening, contact Select Anchors support.
        </p>
        <button
          onClick={() => reset()}
          className="px-4 py-2 rounded-xl bg-[#2f4f4f] text-white"
        >
          Try Again
        </button>
      </div>
    </div>
  );
}
