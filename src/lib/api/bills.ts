import { API_BASE_URL } from "@/lib/api/config";
import type { BillType } from "@/lib/bill-type";
import type { Bill, BillListItem } from "@/lib/types";

// The list page filters/paginates client-side (matches the design
// prototype), so we ask the backend for one large page instead of paging
// server-side. Revisit once bill volume outgrows this.
const LIST_FETCH_LIMIT = 500;

interface BillsPageResponse {
  data: BillListItem[];
  totalRows: number;
}

// One field-level validation error from the backend, e.g.
// { field: "items[1].quantity", tag: "gt=0", value: "0" }.
export interface ApiFieldError {
  field: string;
  tag: string;
  value: string;
}

// Thrown by any call below on a non-2xx response. `fieldErrors` is only
// populated for 400s that carry the backend's structured validation errors
// (code "T-2004") — callers map these back onto the form row/field they
// named.
export class ApiError extends Error {
  fieldErrors: ApiFieldError[];
  constructor(message: string, fieldErrors: ApiFieldError[] = []) {
    super(message);
    this.name = "ApiError";
    this.fieldErrors = fieldErrors;
  }
}

async function throwApiError(res: Response, fallback: string): Promise<never> {
  const body: { message?: string; errors?: ApiFieldError[] } | null = await res
    .json()
    .catch(() => null);
  throw new ApiError(body?.message || fallback, body?.errors ?? []);
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

export async function getBill(id: number): Promise<Bill> {
  const res = await fetch(`${API_BASE_URL}/bills/${id}`, {
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error(`GET /bills/${id} failed with status ${res.status}`);
  }
  return res.json();
}

export async function deleteBill(id: number): Promise<void> {
  const res = await fetch(`${API_BASE_URL}/bills/${id}`, {
    method: "DELETE",
  });
  if (!res.ok) await throwApiError(res, `DELETE /bills/${id} failed`);
}

export interface BillItemInput {
  productId: number;
  // Sent as strings — the backend's decimal.Decimal accepts either, but
  // string keeps what the user typed exact (no float round-tripping).
  quantity: string;
  price: string;
}

export interface CreateBillInput {
  type: BillType;
  storeId: number;
  customerId?: number;
  customerName: string;
  customerAddress: string;
  customerPhone: string;
  discount: string;
  shippingFee: string;
  items: BillItemInput[];
}

export async function createBill(input: CreateBillInput): Promise<Bill> {
  const res = await fetch(`${API_BASE_URL}/bills`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) await throwApiError(res, "POST /bills failed");
  return res.json();
}

// storeId/type must match the bill being edited — the backend rejects a
// mismatch with 400.
export type UpdateBillInput = CreateBillInput;

export async function updateBill(
  id: number,
  input: UpdateBillInput,
): Promise<Bill> {
  const res = await fetch(`${API_BASE_URL}/bills/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) await throwApiError(res, `PUT /bills/${id} failed`);
  return res.json();
}

// Slip is attached/replaced/removed through its own endpoints, independent
// of creating/editing the bill's fields.
export async function uploadSlip(id: number, file: File): Promise<string> {
  const form = new FormData();
  form.set("slip", file);
  const res = await fetch(`${API_BASE_URL}/bills/${id}/slip`, {
    method: "PUT",
    body: form,
  });
  if (!res.ok) await throwApiError(res, "แนบสลิปไม่สำเร็จ");
  const body: { slipUrl: string } = await res.json();
  return body.slipUrl;
}

export async function deleteSlip(id: number): Promise<void> {
  const res = await fetch(`${API_BASE_URL}/bills/${id}/slip`, {
    method: "DELETE",
  });
  if (!res.ok) await throwApiError(res, "ลบสลิปไม่สำเร็จ");
}
