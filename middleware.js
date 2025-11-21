// /middleware.js
import { NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";

export async function middleware(req) {
  const { pathname } = req.nextUrl;
  const token = await getToken({
    req,
    secret: process.env.NEXTAUTH_SECRET,
  });

  const isAuthed = !!token;
  const role = token?.role || "customer";

  // If user is already logged in and hits /login, send them to dashboard
  if (pathname === "/login" && isAuthed) {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  // Protect /account
  if (pathname.startsWith("/account")) {
    if (!isAuthed) {
      return NextResponse.redirect(new URL("/login", req.url));
    }
  }

  // Protect admin pages
  if (pathname.startsWith("/admin")) {
    if (!isAuthed) {
      return NextResponse.redirect(new URL("/login", req.url));
    }
    if (role !== "admin") {
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }
  }

  // Protect admin API routes
  if (pathname.startsWith("/api/admin")) {
    if (!isAuthed || role !== "admin") {
      return new NextResponse("Forbidden", { status: 403 });
    }
  }

  // Driver/dispatch (“My Day”) — employees & admins only
  if (pathname.startsWith("/driver")) {
    if (!isAuthed) {
      return NextResponse.redirect(new URL("/login", req.url));
    }
    if (role !== "admin" && role !== "employee") {
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/login",
    "/account",
    "/admin/:path*",
    "/api/admin/:path*",
    "/driver/:path*",
  ],
};
