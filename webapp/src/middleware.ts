import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

export default auth((req) => {
  const isAuthPage = req.nextUrl.pathname === "/";
  const isProtectedPage =
    req.nextUrl.pathname.startsWith("/dashboard") ||
    req.nextUrl.pathname.startsWith("/settings");

  // CORS for extension API routes — scope to chrome-extension:// origins only
  const isExtensionRoute =
    req.nextUrl.pathname.startsWith("/api/extension") ||
    req.nextUrl.pathname === "/api/submissions" ||
    req.nextUrl.pathname.startsWith("/api/sync") ||
    req.nextUrl.pathname.startsWith("/api/reviews");
  if (isExtensionRoute) {
    const origin = req.headers.get("Origin") ?? "";
    // OPTIONS preflight
    if (req.method === "OPTIONS") {
      const res = new NextResponse(null, { status: 204 });
      if (origin.startsWith("chrome-extension://")) {
        res.headers.set("Access-Control-Allow-Origin", origin);
        res.headers.set("Vary", "Origin");
      }
      res.headers.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
      res.headers.set("Access-Control-Allow-Headers", "Content-Type, x-api-key");
      res.headers.set("Access-Control-Max-Age", "86400");
      return res;
    }
    const response = NextResponse.next();
    if (origin.startsWith("chrome-extension://")) {
      response.headers.set("Access-Control-Allow-Origin", origin);
      response.headers.set("Vary", "Origin");
    }
    response.headers.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    response.headers.set("Access-Control-Allow-Headers", "Content-Type, x-api-key");
    return response;
  }

  if (!req.auth && isProtectedPage) {
    const url = new URL("/", req.nextUrl.origin);
    return NextResponse.redirect(url);
  }

  if (req.auth && isAuthPage) {
    const url = new URL("/dashboard", req.nextUrl.origin);
    return NextResponse.redirect(url);
  }

  const response = NextResponse.next();
  // Security headers
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  return response;
});

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
