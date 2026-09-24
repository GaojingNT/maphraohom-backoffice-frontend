import type { BillType } from "@/lib/bill-type";

// Shape returned by GET /stores — see responses.StoreListItem.
export interface Store {
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
  customerId?: number;
  bookNo: number;
  receiptNo: number;
  customerName: string;
  customerAddress: string;
  customerPhone: string;
  discount: string;
  shippingFee: string;
  total: string;
  // Ready-to-use URL, or null when no slip has been attached — set/cleared
  // only through PUT/DELETE /bills/:id/slip, never by POST/PUT /bills.
  slipUrl: string | null;
  createdAt: string;
  updatedAt: string;
  items: BillItem[];
}
