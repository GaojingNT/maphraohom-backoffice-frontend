import { API_BASE_URL } from "@/lib/api/config";

export interface StoreBasePrice {
  productId: number;
  productName: string;
  unit: string;
  price: number;
  updatedAt: string;
}

export async function getStoreBasePrices(
  storeId: number,
): Promise<StoreBasePrice[]> {
  const res = await fetch(`${API_BASE_URL}/stores/${storeId}/base-prices`, {
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error(
      `GET /stores/${storeId}/base-prices failed with status ${res.status}`,
    );
  }
  return res.json();
}

export async function updateStoreProductPrice(
  storeId: number,
  productId: number,
  price: number,
): Promise<StoreBasePrice> {
  const res = await fetch(
    `${API_BASE_URL}/stores/${storeId}/products/${productId}`,
    {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ price }),
    },
  );
  if (!res.ok) {
    const body: { message?: string } | null = await res
      .json()
      .catch(() => null);
    throw new Error(
      body?.message ??
        `PUT /stores/${storeId}/products/${productId} failed with status ${res.status}`,
    );
  }
  return res.json();
}
