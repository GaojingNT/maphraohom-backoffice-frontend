import { API_BASE_URL } from "@/lib/api/config";

// The backend doesn't yet serve uploaded slip files over HTTP (only
// stores/reads them server-side) — this is a best guess at the future
// static-serving convention and will 404/fail-to-load until that exists.
export function slipUrl(slipKey: string): string {
  return `${API_BASE_URL.replace(/\/api\/v1$/, "")}/storage/${slipKey}`;
}
