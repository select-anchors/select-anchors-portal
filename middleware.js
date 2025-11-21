// middleware.js
import { withAuth } from "next-auth/middleware";

export default withAuth({
  pages: {
    signIn: "/login",
  },
});

export const config = {
  matcher: [
    "/dashboard",
    "/account",
    "/admin/:path*",
    "/driver/:path*",
    "/wells/:path*",
  ],
};
