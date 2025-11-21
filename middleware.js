// /middleware.js
import { NextResponse } from "next/server";
import { authSyncMiddleware } from "./middleware-auth-sync";

export async function middleware(req) {
  // First: sync NextAuth → sa_user/sa_role cookies
  const syncResponse = await authSyncMiddleware(req);
  if (syncResponse) {
    // Continue routing AFTER cookies updated
  }

  const url = req.nextUrl;
  const c = req.cookies;

  const isAuthed = !!c.get("sa_user");
  const role = c.get("sa_role")?.value || "customer";

  // Protect admin pages
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

  // Driver/employee pages
  if (url.pathname.startsWith("/driver")) {
    if (!isAuthed) return NextResponse.redirect(new URL("/login", req.url));
    if (role !== "admin" && role !== "employee") {
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/admin/:path*",
    "/api/admin/:path*",
    "/driver/:path*",
  ],
};
