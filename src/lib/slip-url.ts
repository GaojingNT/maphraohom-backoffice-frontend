import { API_BASE_URL } from "@/lib/api/config";

export function slipUrl(slipKey: string): string {
  return `${API_BASE_URL}/files/${slipKey}`;
}
