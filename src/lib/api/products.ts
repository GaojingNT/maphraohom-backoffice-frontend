import { apiFetch } from "@/lib/api/fetch";

export interface ProductListItem {
  id: number;
  name: string;
  unit: string;
  // "all": usable on any bill (the coconut catalog). "payment": an item
  // typed in on a payment bill, payment bills only. Optional so an older
  // backend that doesn't send it reads as "all".
  billScope?: "all" | "payment";
}

// Units a user can pick for an item typed in on a payment bill — matches
// models.PaymentItemUnits on the backend, which enforces it. The first is
// the default.
export const PAYMENT_ITEM_UNITS = [
  "รายการ",
  "ครั้ง",
  "ชิ้น",
  "ถุง",
  "กก.",
  "ขวด",
] as const;

// Same rule as the backend's models.NormalizeProductName: trim and collapse
// inner whitespace, so "ค่า  ขนส่ง " matches "ค่า ขนส่ง".
export function normalizeProductName(name: string): string {
  return name.trim().split(/\s+/).filter(Boolean).join(" ");
}

// Receipt bills only list the coconut catalog; payment bills list
// everything, including items typed in on earlier payment bills.
export function productsForBillType(
  products: ProductListItem[],
  type: "receipt" | "payment",
): ProductListItem[] {
  return type === "receipt"
    ? products.filter((p) => p.billScope !== "payment")
    : products;
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
