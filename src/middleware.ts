import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token;
    const isAuth = !!token;
    const isAdminRoute = req.nextUrl.pathname.startsWith("/admin");

    // If accessing /admin/* and user is NOT an ADMIN
    if (isAdminRoute) {
      if (!isAuth) {
        const loginUrl = new URL("/login", req.url);
        loginUrl.searchParams.set("callbackUrl", req.nextUrl.pathname);
        return NextResponse.redirect(loginUrl);
      }

      if (token.role !== "ADMIN") {
        // Logged in as CUSTOMER trying to access admin
        const loginUrl = new URL("/login", req.url);
        loginUrl.searchParams.set("error", "AccessDenied");
        return NextResponse.redirect(loginUrl);
      }
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        const path = req.nextUrl.pathname;
        // Require auth for /admin and /my-bookings
        if (path.startsWith("/admin") || path.startsWith("/my-bookings")) {
          return !!token;
        }
        return true;
      },
    },
    pages: {
      signIn: "/login",
    },
  }
);

export const config = {
  matcher: ["/admin/:path*", "/my-bookings/:path*"],
};
