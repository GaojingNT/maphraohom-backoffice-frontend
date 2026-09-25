import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { SESSION_COOKIE } from "@/lib/auth/constants";

// Pages reachable without signing in.
const PUBLIC_PATHS = ["/login", "/logout"];

// Optimistic check only — reads the JWT's `exp` without verifying the
// signature (the backend does that on every authenticated call, and
// lib/auth/session.ts sends a rejected token through /logout). Its job is
// just to keep signed-out visitors off every page and skip a pointless
// round-trip for a token that's plainly expired.
function isTokenFresh(token: string): boolean {
  try {
    const payload = token.split(".")[1];
    if (!payload) return false;
    const json = JSON.parse(atob(payload.replace(/-/g, "+").replace(/_/g, "/")));
    return typeof json.exp === "number" && json.exp * 1000 > Date.now();
  } catch {
    return false;
  }
}

export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const signedIn = !!token && isTokenFresh(token);
  const isPublic = PUBLIC_PATHS.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`),
  );

  if (!signedIn && !isPublic) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", pathname + search);
    const response = NextResponse.redirect(loginUrl);
    if (token) response.cookies.delete(SESSION_COOKIE);
    return response;
  }

  if (signedIn && pathname === "/login") {
    return NextResponse.redirect(new URL("/", request.url));
  }

  return NextResponse.next();
}

export const config = {
  // Everything except Next's own assets, files with an extension
  // (favicon.ico, public/*.svg, …), and the /api/* gateway — that answers a
  // missing/expired session with a JSON 401 itself, which fetch() callers
  // and <img> tags handle better than an HTML redirect to /login.
  matcher: ["/((?!api/|_next/static|_next/image|.*\\.[^/]+$).*)"],
};
