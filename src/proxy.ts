import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow public routes without authentication
  const publicPaths = ["/login", "/api/auth"];
  const isPublicPath = publicPaths.some((path) => pathname.startsWith(path));

  if (isPublicPath) {
    return NextResponse.next();
  }

  const token = await getToken({ req: request });

  // Redirect unauthenticated users to login
  if (!token) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // If authenticated user visits /login, redirect to dashboard
  if (pathname === "/login") {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  const role = (token.role as string) || "EMPLOYEE";

  // Role-based route protection
  const managerPaths = ["/dashboard/team", "/dashboard/approve"];
  const adminPaths = [
    "/dashboard/employees",
    "/dashboard/cycles",
    "/dashboard/shared-goals",
    "/dashboard/escalations",
    "/dashboard/reports",
    "/dashboard/analytics",
    "/dashboard/audit-log",
    "/dashboard/settings",
  ];

  const isManagerPath = managerPaths.some((path) => pathname.startsWith(path));
  const isAdminPath = adminPaths.some((path) => pathname.startsWith(path));

  // Block non-managers from manager routes
  if (isManagerPath && role !== "MANAGER" && role !== "ADMIN") {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  // Block non-admins from admin routes
  if (isAdminPath && role !== "ADMIN") {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)",
  ],
};
