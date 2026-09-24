import { API_BASE_URL } from "@/lib/api/config";
import { resolveFileUrl } from "@/lib/slip-url";
import type { BillType } from "@/lib/bill-type";
import type { Store } from "@/lib/types";

interface StoresPageResponse {
  data: Store[];
}

// The backend returns logo/signature as paths relative to the API's own
// origin — same reasoning as resolveBillSlipUrl in lib/api/bills.ts.
function resolveStoreUrls(store: Store): Store {
  return {
    ...store,
    logo: store.logo ? resolveFileUrl(store.logo) : store.logo,
    signature: store.signature ? resolveFileUrl(store.signature) : store.signature,
  };
}

async function throwStoreApiError(res: Response, fallback: string): Promise<never> {
  const body: { message?: string } | null = await res.json().catch(() => null);
  throw new Error(body?.message || fallback);
}

export async function getStores(): Promise<Store[]> {
  const res = await fetch(`${API_BASE_URL}/stores?limit=100`, {
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error(`GET /stores failed with status ${res.status}`);
  }
  const page: StoresPageResponse = await res.json();
  return page.data.map(resolveStoreUrls);
}

export async function getStore(id: number): Promise<Store> {
  const res = await fetch(`${API_BASE_URL}/stores/${id}`, {
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error(`GET /stores/${id} failed with status ${res.status}`);
  }
  return resolveStoreUrls(await res.json());
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
  const res = await fetch(`${API_BASE_URL}/stores/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) await throwStoreApiError(res, `PUT /stores/${id} failed`);
  return resolveStoreUrls(await res.json());
}

// Logo/signature are attached/replaced/removed through their own endpoints,
// independent of updating the store's name/address/phone.
export async function uploadLogo(id: number, file: File): Promise<string> {
  const form = new FormData();
  form.set("logo", file);
  const res = await fetch(`${API_BASE_URL}/stores/${id}/logo`, {
    method: "PUT",
    body: form,
  });
  if (!res.ok) await throwStoreApiError(res, "อัปโหลดโลโก้ไม่สำเร็จ");
  const body: { logo: string } = await res.json();
  return resolveFileUrl(body.logo);
}

export async function deleteLogo(id: number): Promise<void> {
  const res = await fetch(`${API_BASE_URL}/stores/${id}/logo`, {
    method: "DELETE",
  });
  if (!res.ok) await throwStoreApiError(res, "ลบโลโก้ไม่สำเร็จ");
}

export async function uploadSignature(id: number, file: File): Promise<string> {
  const form = new FormData();
  form.set("signature", file);
  const res = await fetch(`${API_BASE_URL}/stores/${id}/signature`, {
    method: "PUT",
    body: form,
  });
  if (!res.ok) await throwStoreApiError(res, "อัปโหลดลายเซ็นไม่สำเร็จ");
  const body: { signature: string } = await res.json();
  return resolveFileUrl(body.signature);
}

export async function deleteSignature(id: number): Promise<void> {
  const res = await fetch(`${API_BASE_URL}/stores/${id}/signature`, {
    method: "DELETE",
  });
  if (!res.ok) await throwStoreApiError(res, "ลบลายเซ็นไม่สำเร็จ");
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
