import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { AuthApiError, fetchProfile } from "@/lib/api/auth";
import { SESSION_COOKIE } from "@/lib/auth/constants";
import type { Profile } from "@/lib/types";

// Server-only helpers (they import next/headers) — for Server Components and
// Server Actions. The session is just the backend's JWT, kept in an httpOnly
// cookie so page scripts can never read it.

export async function getSessionToken(): Promise<string | null> {
  const cookieStore = await cookies();
  return cookieStore.get(SESSION_COOKIE)?.value || null;
}

// The token, or a redirect to /login when there's none. proxy.ts already
// keeps signed-out visitors off every page, so this only trips on a race
// (cookie expiring between the proxy check and the render).
export async function requireSessionToken(): Promise<string> {
  const token = await getSessionToken();
  if (!token) redirect("/login");
  return token;
}

// The signed-in user's profile. A 401 means the backend rejected the token
// (expired, or signed with a rotated secret) — send the browser through
// /logout, which clears the cookie before landing on /login; redirecting
// straight to /login would bounce back here via proxy.ts while the stale
// cookie is still set.
export async function getCurrentProfile(): Promise<Profile> {
  const token = await requireSessionToken();
  try {
    return await fetchProfile(token);
  } catch (err) {
    if (err instanceof AuthApiError && err.status === 401) redirect("/logout");
    throw err;
  }
}
