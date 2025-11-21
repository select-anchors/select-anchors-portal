// /middleware-auth-sync.js
import { NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";

export async function authSyncMiddleware(req) {
  const token = await getToken({
    req,
    secret: process.env.NEXTAUTH_SECRET,
  });

  const res = NextResponse.next();

  if (token) {
    // Sync cookies with NextAuth token values
    res.cookies.set("sa_user", token.uid, {
      httpOnly: true,
      sameSite: "lax",
      secure: true,
      path: "/",
    });
    res.cookies.set("sa_role", token.role || "customer", {
      httpOnly: true,
      sameSite: "lax",
      secure: true,
      path: "/",
    });
  } else {
    // If not logged in, remove legacy cookies
    res.cookies.delete("sa_user");
    res.cookies.delete("sa_role");
  }

  return res;
}
