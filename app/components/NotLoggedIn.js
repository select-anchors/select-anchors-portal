// /app/components/NotLoggedIn.js

import Link from "next/link";

export default function NotLoggedIn() {
  return (
    <div className="container py-20 flex flex-col items-center text-center space-y-6">
      <h1 className="text-3xl font-bold text-[#2f4f4f]">
        Welcome to Select Anchors
      </h1>

      <p className="text-gray-600 max-w-lg">
        This portal gives you access to well data, anchor tests, daily routes,
        admin tools, and customer resources.  
        Please sign in to continue.
      </p>

      <Link
        href="/login"
        className="px-6 py-3 rounded-xl bg-[#2f4f4f] text-white hover:opacity-90 text-lg"
      >
        Login
      </Link>
    </div>
  );
}
