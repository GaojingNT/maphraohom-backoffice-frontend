// Name of the httpOnly cookie holding the backend's JWT — shared by
// proxy.ts, lib/auth/session.ts and the auth Server Actions.
export const SESSION_COOKIE = "mph_session";

// Where to go after signing in. Only same-origin absolute paths are accepted
// so ?next= can't be used as an open redirect ("//evil.com" and
// "/\evil.com" are both protocol-relative to a browser).
export function safeNextPath(next: unknown): string {
  if (typeof next !== "string") return "/";
  if (!next.startsWith("/") || next.startsWith("//") || next.startsWith("/\\")) {
    return "/";
  }
  if (next.startsWith("/login") || next.startsWith("/logout")) return "/";
  return next;
}
