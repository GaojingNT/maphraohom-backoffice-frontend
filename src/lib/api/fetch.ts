import { API_BASE_URL } from "@/lib/api/config";
import { SESSION_COOKIE } from "@/lib/auth/constants";

// Every backend endpoint requires a signed-in user (Authorization: Bearer
// <JWT>), and the JWT lives in an httpOnly cookie page scripts can't read.
// So the same call is routed differently depending on where it runs:
//
//   - Server (Server Components, Server Actions): straight to the backend,
//     with the token read from the request's cookie.
//   - Browser (client components' event handlers): to this app's own
//     /api/v1/* route handler (app/api/v1/[...path]/route.ts), which the
//     browser sends the cookie to automatically and which forwards the
//     request to the backend with the token attached.
//
// `path` is relative to /api/v1, e.g. "/bills/3".
export async function apiFetch(path: string, init: RequestInit = {}): Promise<Response> {
  if (typeof window !== "undefined") {
    const res = await fetch(`/api/v1${path}`, init);
    if (res.status === 401) {
      // Session expired or revoked mid-use — clear it and sign in again.
      // A full navigation on purpose: /logout is a route handler that
      // clears the httpOnly cookie, which client-side routing can't do.
      // eslint-disable-next-line @next/next/no-location-assign-relative-destination
      window.location.assign("/logout");
    }
    return res;
  }

  // Imported lazily so this module stays importable from client components
  // (next/headers is server-only; this branch never runs in the browser).
  const { cookies } = await import("next/headers");
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  const headers = new Headers(init.headers);
  if (token) headers.set("Authorization", `Bearer ${token}`);

  const res = await fetch(`${API_BASE_URL}${path}`, { ...init, headers });
  if (res.status === 401) {
    // Same handling as lib/auth/session.ts — /logout clears the stale cookie
    // before /login, so proxy.ts can't bounce the browser straight back.
    const { redirect } = await import("next/navigation");
    redirect("/logout");
  }
  return res;
}
