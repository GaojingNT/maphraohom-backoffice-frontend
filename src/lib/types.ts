import type { BillType } from "@/lib/bill-type";

// Shape returned by GET /stores — see responses.StoreListItem. GET
// /stores/:id and PUT /stores/:id return the fuller StoreDetailResponse
// (address/phone/owners included); the list endpoint's items simply
// don't set those fields, so they come through as undefined.
export interface Store {
  id: number;
  name: string;
  logo: string;
  address?: string;
  phone?: string;
  owners?: StoreOwner[];
}

// One of a store's owners (a store can have several, and a user can own
// several stores).
export interface StoreOwner {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
}

// Shape returned by GET/PUT /auth/profile — the signed-in user.
export interface Profile {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  // Ready-to-use URL, or "" when unset. Printed on every receipt this user
  // exports (the signature used to belong to the store).
  signature: string;
  stores: ProfileStore[];
}

export interface ProfileStore {
  id: number;
  name: string;
  logo: string;
}

export interface BillItem {
  id: number;
  productId: number;
  productName: string;
  // Snapshot of products.unit at issue time — 'กก.' or 'ขวด'.
  unit: string;
  // Decimal strings — the API sends money/quantity as strings so JS floats
  // never touch them in transit. Parse with lib/money's toNumber() only for
  // display-math; never for anything sent back to the server.
  quantity: string;
  price: string;
  subtotal: string;
}

// Shape returned by GET /bills (paginated list) — see
// responses.BillListItem in the backend. totalQuantity is gone: กก. and
// ขวด can't be summed together, so the backend no longer sends a combined
// figure.
export interface BillListItem {
  id: number;
  type: BillType;
  storeId: number;
  storeName: string;
  bookNo: number;
  receiptNo: number;
  customerName: string;
  customerAddress: string;
  total: string;
  itemCount: number;
  hasSlip: boolean;
  createdAt: string;
}

// Shape returned by GET /bills/{id} — see responses.BillDetailResponse.
export interface Bill {
  id: number;
  type: BillType;
  storeId: number;
  storeName: string;
  storeLogo?: string;
  storeAddress?: string;
  storePhone?: string;
  customerId?: number;
  bookNo: number;
  receiptNo: number;
  customerName: string;
  customerAddress: string;
  customerPhone: string;
  discount: string;
  shippingFee: string;
  total: string;
  // The first of `slips`' URLs, or null when there are none — kept by the
  // backend for clients from before a bill could carry several slips.
  slipUrl: string | null;
  // Every slip in attach order (at most MAX_SLIPS_PER_BILL) — added/removed
  // only through POST/DELETE /bills/:id/slips, never by POST/PUT /bills.
  // Optional so an older backend that doesn't send it still type-checks;
  // read it through billSlips().
  slips?: BillSlip[];
  createdAt: string;
  updatedAt: string;
  // Audit fields — null when unknown: createdBy for bills from before it
  // was recorded, editedAt when never edited via PUT /bills/:id,
  // slipUploadedAt (the most recent slip's) when there's no slip. Optional so an older backend that
  // doesn't send them still type-checks as "unknown".
  createdBy?: BillCreator | null;
  editedAt?: string | null;
  slipUploadedAt?: string | null;
  items: BillItem[];
}

// One slip image attached to a bill.
export interface BillSlip {
  id: number;
  // Ready-to-use "/api/v1/files/..." path.
  url: string;
  uploadedAt: string;
}

// Who issued a bill — name only (GET /bills/:id never sends their email).
export interface BillCreator {
  id: number;
  firstName: string;
  lastName: string;
}
