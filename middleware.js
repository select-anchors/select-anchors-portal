// middleware.js
import { NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";

function getDefaultPermissions(role = "customer") {
  const ROLE_DEFAULTS = {
    admin: {
      can_view_all_wells: true,
      can_use_dispatch: true,
      can_manage_users: true,
    },
    employee: {
      can_view_all_wells: true,
      can_use_dispatch: true,
      can_manage_users: false,
    },
    customer: {
      can_view_all_wells: false,
      can_use_dispatch: false,
      can_manage_users: false,
    },
  };

  return ROLE_DEFAULTS[role] || ROLE_DEFAULTS.customer;
}

function resolvePermissions(role = "customer", companyPermissions = null, userPermissions = null) {
  return {
    ...getDefaultPermissions(role),
    ...(companyPermissions || {}),
    ...(userPermissions || {}),
  };
}

export async function middleware(req) {
  const { pathname } = req.nextUrl;

  const token = await getToken({
    req,
    secret: process.env.NEXTAUTH_SECRET,
  });

  const isAuthed = !!token;
  const role = token?.role || "customer";

  const permissions = resolvePermissions(
    role,
    token?.company_permissions_json || null,
    token?.permissions_json || null
  );

  const canViewAllWells = !!permissions.can_view_all_wells;
  const canManageUsers = !!permissions.can_manage_users;
  const canUseDispatch = !!permissions.can_use_dispatch;

  if (pathname === "/login" && isAuthed) {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  if (pathname.startsWith("/account")) {
    if (!isAuthed) {
      return NextResponse.redirect(new URL("/login", req.url));
    }
  }

  // Allow admin user pages only for real admins / managers of users
  if (pathname.startsWith("/admin/users")) {
    if (!isAuthed) {
      return NextResponse.redirect(new URL("/login", req.url));
    }
    if (!canManageUsers) {
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }
  }

  // Allow well-management pages for anyone with can_view_all_wells
  if (pathname.startsWith("/admin/wells")) {
    if (!isAuthed) {
      return NextResponse.redirect(new URL("/login", req.url));
    }
    if (!canViewAllWells) {
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }
  }

  // Other admin pages remain admin-only for now
  if (
    pathname.startsWith("/admin") &&
    !pathname.startsWith("/admin/wells") &&
    !pathname.startsWith("/admin/users")
  ) {
    if (!isAuthed) {
      return NextResponse.redirect(new URL("/login", req.url));
    }
    if (role !== "admin") {
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }
  }

  if (pathname.startsWith("/api/admin")) {
    if (!isAuthed || role !== "admin") {
      return new NextResponse("Forbidden", { status: 403 });
    }
  }

  if (pathname.startsWith("/driver")) {
    if (!isAuthed) {
      return NextResponse.redirect(new URL("/login", req.url));
    }
    if (!canUseDispatch) {
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
