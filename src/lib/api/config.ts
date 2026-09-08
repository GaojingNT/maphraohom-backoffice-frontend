// `API_BASE_URL` is read server-side; `NEXT_PUBLIC_API_BASE_URL` is the same
// value exposed to the browser for client components that call the API
// directly (e.g. the create-bill form). Next.js inlines unprefixed env vars
// to "" in the client bundle, so this falls through correctly either way.
export const API_BASE_URL =
  process.env.API_BASE_URL ||
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  "http://103.91.204.103:8000/api/v1";
