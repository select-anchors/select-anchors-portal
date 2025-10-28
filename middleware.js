// /middleware.js
import { NextResponse } from "next/server";

export function middleware(req) {
  const url = req.nextUrl;
  const c = req.cookies;

  const isAuthed = !!c.get("sa_user");
  const role = c.get("sa_role")?.value || "customer"; // "admin" | "employee" | "customer"

  // Protect all admin pages
  if (url.pathname.startsWith("/admin")) {
    if (!isAuthed) return NextResponse.redirect(new URL("/login", req.url));
    if (role !== "admin") return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  // Admin-only API routes
  if (url.pathname.startsWith("/api/admin")) {
    if (!isAuthed || role !== "admin") {
      return new NextResponse("Forbidden", { status: 403 });
    }
  }

  // Driver/dispatch (“My Day”) — employees & admins only
  if (url.pathname.startsWith("/driver")) {
    if (!isAuthed) return NextResponse.redirect(new URL("/login", req.url));
    if (role !== "admin" && role !== "employee") {
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/api/admin/:path*", "/driver/:path*"],
};
