import { API_BASE_URL } from "@/lib/api/config";
import type { BillType } from "@/lib/bill-type";
import type { Store } from "@/lib/types";

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

export interface LastPriceItem {
  productId: number;
  price: string;
}

// The price this store last used for each product, for the given bill type
// (buy and sell prices never mix) — used only to prefill the create-bill
// form; the user can always overwrite it.
export async function getLastPrices(
  storeId: number,
  type: BillType,
): Promise<LastPriceItem[]> {
  const res = await fetch(
    `${API_BASE_URL}/stores/${storeId}/last-prices?type=${type}`,
    { cache: "no-store" },
  );
  if (!res.ok) {
    throw new Error(
      `GET /stores/${storeId}/last-prices failed with status ${res.status}`,
    );
  }
  return res.json();
}
