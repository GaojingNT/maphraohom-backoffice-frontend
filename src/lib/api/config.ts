// `API_BASE_URL` is read server-side; `NEXT_PUBLIC_API_BASE_URL` is the same
// value exposed to the browser for client components that call the API
// directly (e.g. the create-bill form). Next.js inlines unprefixed env vars
// to "" in the client bundle, so this falls through correctly either way.
//
// This must be HTTPS: the site is served over HTTPS, and browsers silently
// block "mixed content" — a page fetching plain HTTP from client-side code
// (e.g. handleStoreChange's product lookup) — so a bare http:// backend URL
// here breaks every client-side API call with no visible error.
export const API_BASE_URL =
  process.env.API_BASE_URL ||
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  "https://api.103-91-204-103.sslip.io/api/v1";
