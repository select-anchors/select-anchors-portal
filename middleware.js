// /middleware.js
import { NextResponse } from "next/server";

export function middleware(req) {
  const url = req.nextUrl;

  // We’ll read simple cookies your login sets:
  //  - sa_user:    unique id or email (presence = authenticated)
  //  - sa_email:   user’s email (used to look up assigned wells)
  //  - sa_role:    "admin" or "customer"
  const c = req.cookies;
  const isAuthed = !!c.get("sa_user");
  const role = c.get("sa_role")?.value || "customer";

  // Gate all admin pages
  if (url.pathname.startsWith("/admin")) {
    if (!isAuthed) return NextResponse.redirect(new URL("/login", req.url));
    if (role !== "admin") return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  // Gate admin-only API endpoints
  if (url.pathname.startsWith("/api/admin")) {
    if (!isAuthed || role !== "admin") {
      return new NextResponse("Forbidden", { status: 403 });
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/api/admin/:path*"],
};
