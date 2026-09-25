import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SESSION_COOKIE } from "@/lib/auth/constants";

// Clears a dead session and lands on /login. Server Components can't delete
// cookies, so when one finds the backend rejecting the token
// (lib/auth/session.ts) it redirects here instead of straight to /login —
// otherwise proxy.ts would see the still-set cookie and bounce back. The
// sign-out button uses signOutAction (a POST), not this route.
export async function GET() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
  redirect("/login");
}
