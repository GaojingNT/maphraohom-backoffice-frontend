import { API_BASE_URL } from "@/lib/api/config";
import type { Bill, BillListItem } from "@/lib/types";

// The list page filters/paginates client-side (matches the design
// prototype), so we ask the backend for one large page instead of paging
// server-side. Revisit once bill volume outgrows this.
const LIST_FETCH_LIMIT = 500;

interface BillsPageResponse {
  data: BillListItem[];
  totalRows: number;
}

export async function getBills(): Promise<BillListItem[]> {
  const res = await fetch(`${API_BASE_URL}/bills?limit=${LIST_FETCH_LIMIT}`, {
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error(`GET /bills failed with status ${res.status}`);
  }
  const page: BillsPageResponse = await res.json();
  return page.data;
}

export interface CreateBillItemInput {
  productId: number;
  kilogram: number;
}

export interface CreateBillInput {
  storeId: number;
  customerName: string;
  customerAddress: string;
  items: CreateBillItemInput[];
  discount: number;
  shippingFee: number;
  slip: File | null;
}

export async function createBill(input: CreateBillInput): Promise<Bill> {
  const form = new FormData();
  form.set("storeId", String(input.storeId));
  form.set("customerName", input.customerName);
  form.set("customerAddress", input.customerAddress);
  form.set("items", JSON.stringify(input.items));
  if (input.discount) form.set("discount", String(input.discount));
  if (input.shippingFee) form.set("shippingFee", String(input.shippingFee));
  if (input.slip) form.set("slip", input.slip);

  const res = await fetch(`${API_BASE_URL}/bills`, {
    method: "POST",
    body: form,
  });
  if (!res.ok) {
    const body: { message?: string } | null = await res.json().catch(() => null);
    throw new Error(body?.message ?? `POST /bills failed with status ${res.status}`);
  }
  return res.json();
}
