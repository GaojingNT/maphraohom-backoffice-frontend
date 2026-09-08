import { API_BASE_URL } from "@/lib/api/config";
import type { Store, StoreProductPrice } from "@/lib/types";

interface StoresPageResponse {
  data: Store[];
}

export async function getStores(): Promise<Store[]> {
  const res = await fetch(`${API_BASE_URL}/stores?limit=100`, {
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error(`GET /stores failed with status ${res.status}`);
  }
  const page: StoresPageResponse = await res.json();
  return page.data;
}

export async function getStoreProducts(
  storeId: number
): Promise<StoreProductPrice[]> {
  const res = await fetch(`${API_BASE_URL}/stores/${storeId}/products`, {
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error(`GET /stores/${storeId}/products failed with status ${res.status}`);
  }
  return res.json();
}
