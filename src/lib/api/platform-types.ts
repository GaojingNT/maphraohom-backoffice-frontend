import { apiFetch } from "@/lib/api/fetch";
import type { PlatformType } from "@/lib/types";

// Active sales platforms (Facebook, TikTok, ...) in display order — GET
// /platform-types. Returns [] instead of throwing so the bill pages still
// work against a backend that doesn't have platforms yet (the picker and
// filter just don't show).
export async function getPlatformTypes(): Promise<PlatformType[]> {
  try {
    const res = await apiFetch(`/platform-types`, { cache: "no-store" });
    if (!res.ok) return [];
    return await res.json();
  } catch {
    return [];
  }
}
