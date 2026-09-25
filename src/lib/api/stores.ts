import { apiFetch } from "@/lib/api/fetch";
import type { BillType } from "@/lib/bill-type";
import type { Store } from "@/lib/types";

interface StoresPageResponse {
  data: Store[];
}

// logo comes back as an "/api/v1/files/..." path, used as-is — see the
// note at the top of lib/api/bills.ts.

async function throwStoreApiError(res: Response, fallback: string): Promise<never> {
  const body: { message?: string } | null = await res.json().catch(() => null);
  throw new Error(body?.message || fallback);
}

export async function getStores(): Promise<Store[]> {
  const res = await apiFetch(`/stores?limit=100`, {
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error(`GET /stores failed with status ${res.status}`);
  }
  const page: StoresPageResponse = await res.json();
  return page.data;
}

export async function getStore(id: number): Promise<Store> {
  const res = await apiFetch(`/stores/${id}`, {
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error(`GET /stores/${id} failed with status ${res.status}`);
  }
  return await res.json();
}

export interface UpdateStoreInput {
  name: string;
  address: string;
  phone: string;
}

export async function updateStore(
  id: number,
  input: UpdateStoreInput,
): Promise<Store> {
  const res = await apiFetch(`/stores/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) await throwStoreApiError(res, `PUT /stores/${id} failed`);
  return await res.json();
}

// The logo is attached/replaced/removed through its own endpoints,
// independent of updating the store's name/address/phone.
export async function uploadLogo(id: number, file: File): Promise<string> {
  const form = new FormData();
  form.set("logo", file);
  const res = await apiFetch(`/stores/${id}/logo`, {
    method: "PUT",
    body: form,
  });
  if (!res.ok) await throwStoreApiError(res, "อัปโหลดโลโก้ไม่สำเร็จ");
  const body: { logo: string } = await res.json();
  return body.logo;
}

export async function deleteLogo(id: number): Promise<void> {
  const res = await apiFetch(`/stores/${id}/logo`, {
    method: "DELETE",
  });
  if (!res.ok) await throwStoreApiError(res, "ลบโลโก้ไม่สำเร็จ");
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
  const res = await apiFetch(`/stores/${storeId}/last-prices?type=${type}`,
    { cache: "no-store" },
  );
  if (!res.ok) {
    throw new Error(
      `GET /stores/${storeId}/last-prices failed with status ${res.status}`,
    );
  }
  return res.json();
}
