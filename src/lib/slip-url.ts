import { API_BASE_URL } from "@/lib/api/config";

// The backend now returns a ready-to-use relative path for a bill's slip
// (Bill.slipUrl, e.g. "/api/v1/files/slip/2026-09-24/<uuid>.jpg") instead of
// a raw object key — this just anchors it to the API's origin so the
// browser can load it directly. API_BASE_URL already ends in "/api/v1", so
// its origin (protocol + host) is what we need here.
export function resolveFileUrl(relativePath: string): string {
  return new URL(relativePath, API_BASE_URL).toString();
}
