import { API_BASE_URL } from "@/lib/api/config";

export interface ProductListItem {
  id: number;
  name: string;
  unit: string;
}

export async function getProducts(): Promise<ProductListItem[]> {
  const res = await fetch(`${API_BASE_URL}/products`, {
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error(`GET /products failed with status ${res.status}`);
  }
  return res.json();
}
