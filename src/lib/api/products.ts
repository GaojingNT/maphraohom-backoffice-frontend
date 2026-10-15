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

// Units the payment-bill form offers first — matches models.CommonUnits on
// the backend. The first is the default. Any other unit can be typed in, up
// to MAX_UNIT_LENGTH characters (the backend enforces that).
export const COMMON_UNITS = [
  "รายการ",
  "ครั้ง",
  "ชิ้น",
  "ถุง",
  "ลัง",
  "กล่อง",
  "แพ็ค",
  "กก.",
  "ขวด",
  "ลิตร",
  "เที่ยว",
  "วัน",
];
export const MAX_UNIT_LENGTH = 20;

// COMMON_UNITS plus any other unit a product already uses (typed on an
// earlier bill), so a once-typed unit is offered in the dropdown next time.
export function unitOptions(products: ProductListItem[]): string[] {
  const extra = products
    .map((p) => p.unit)
    .filter((u) => !COMMON_UNITS.includes(u));
  return [...COMMON_UNITS, ...new Set(extra)];
}

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
