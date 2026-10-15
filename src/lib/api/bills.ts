import { apiFetch } from "@/lib/api/fetch";
import type { BillType } from "@/lib/bill-type";
import type { Bill, BillListItem, BillSlip } from "@/lib/types";

// Slip urls/storeLogo come back as "/api/v1/files/..." paths. They're used
// as-is: the browser resolves them against this app's origin, where
// app/api/v1/[...path]/route.ts serves them with the session attached.

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

// storeId narrows the fetch server-side (GET /bills?storeId=), so one
// store's list is complete even when all stores together pass
// LIST_FETCH_LIMIT. The list's other filters still run client-side.
export async function getBills(
  filter: { storeId?: number | null } = {},
): Promise<BillListItem[]> {
  const params = new URLSearchParams({ limit: String(LIST_FETCH_LIMIT) });
  if (filter.storeId != null) params.set("storeId", String(filter.storeId));
  const res = await apiFetch(`/bills?${params.toString()}`, {
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error(`GET /bills failed with status ${res.status}`);
  }
  const page: BillsPageResponse = await res.json();
  return page.data;
}

export async function getBill(id: number): Promise<Bill> {
  const res = await apiFetch(`/bills/${id}`, {
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error(`GET /bills/${id} failed with status ${res.status}`);
  }
  return await res.json();
}

export async function deleteBill(id: number): Promise<void> {
  const res = await apiFetch(`/bills/${id}`, {
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
  // ISO string to back-/post-date the bill — create only (the backend
  // ignores it on PUT /bills/:id, so UpdateBillInput never sets it).
  // Omitted -> the backend defaults to now.
  createdAt?: string;
}

export async function createBill(input: CreateBillInput): Promise<Bill> {
  const res = await apiFetch(`/bills`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) await throwApiError(res, "POST /bills failed");
  return await res.json();
}

// storeId/type must match the bill being edited — the backend rejects a
// mismatch with 400.
export type UpdateBillInput = CreateBillInput;

export async function updateBill(
  id: number,
  input: UpdateBillInput,
): Promise<Bill> {
  const res = await apiFetch(`/bills/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) await throwApiError(res, `PUT /bills/${id} failed`);
  return await res.json();
}

// Matches models.MaxSlipsPerBill on the backend, which enforces it.
export const MAX_SLIPS_PER_BILL = 5;

// A bill's slips, falling back to the single slipUrl for a response from a
// backend that predates `slips` (that slip has no id, so it can't be
// deleted individually — id 0 is never a real row).
export function billSlips(bill: Bill): BillSlip[] {
  if (bill.slips) return bill.slips;
  return bill.slipUrl
    ? [{ id: 0, url: bill.slipUrl, uploadedAt: bill.slipUploadedAt ?? "" }]
    : [];
}

// Slips are added/removed one at a time through their own endpoints,
// independent of creating/editing the bill's fields. One image per request
// keeps each upload under the backend's body size limit.
export async function addSlip(billId: number, file: File): Promise<BillSlip> {
  const form = new FormData();
  form.set("slip", file);
  const res = await apiFetch(`/bills/${billId}/slips`, {
    method: "POST",
    body: form,
  });
  if (!res.ok) await throwApiError(res, "แนบสลิปไม่สำเร็จ");
  return await res.json();
}

export async function deleteSlip(
  billId: number,
  slipId: number,
): Promise<void> {
  const res = await apiFetch(`/bills/${billId}/slips/${slipId}`, {
    method: "DELETE",
  });
  if (!res.ok) await throwApiError(res, "ลบสลิปไม่สำเร็จ");
}
