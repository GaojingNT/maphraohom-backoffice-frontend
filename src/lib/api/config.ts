// The backend's base URL, used only on the server: Server Components and
// Server Actions call it directly, and the browser reaches it through this
// app's own /api/v1/* route handler (see lib/api/fetch.ts), never directly —
// every endpoint requires the session token, which lives in an httpOnly
// cookie the browser's JS can't read.
//
// Read at runtime (not inlined at build time), so changing API_BASE_URL in
// the container's env is enough. NEXT_PUBLIC_API_BASE_URL is still honored
// as a fallback for existing deployments that only set that one.
export const API_BASE_URL =
  process.env.API_BASE_URL ||
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  "https://api.103-91-204-103.sslip.io/api/v1";
