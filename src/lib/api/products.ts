import { apiFetch } from "@/lib/api/fetch";

export interface ProductListItem {
  id: number;
  name: string;
  unit: string;
}

export async function getProducts(): Promise<ProductListItem[]> {
  const res = await apiFetch(`/products`, {
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error(`GET /products failed with status ${res.status}`);
  }
  return res.json();
}
