// Shape returned by GET /stores — see responses.StoreListItem.
export interface Store {
  id: number;
  name: string;
  logo: string;
}

// One product's currently effective price at a store — see
// responses.StoreProductPriceItem, returned by GET /stores/{id}/products.
export interface StoreProductPrice {
  productId: number;
  productName: string;
  price: number;
  effectiveFrom: string;
}

export interface BillItem {
  id: number;
  productId: number;
  productName: string;
  kilogram: number;
  price: number;
  subtotal: number;
}

// Shape returned by GET /bills (paginated list) — see
// responses.BillListItem in the backend.
export interface BillListItem {
  id: number;
  storeId: number;
  storeName: string;
  receiptNo: number;
  customerName: string;
  customerAddress: string;
  total: number;
  totalKilogram: number;
  itemCount: number;
  createdAt: string;
}

// Shape returned by GET /bills/{id} — see responses.BillDetailResponse.
export interface Bill {
  id: number;
  storeId: number;
  storeName: string;
  storeLogo?: string;
  customerId?: number;
  bookNo: number;
  receiptNo: number;
  customerName: string;
  customerAddress: string;
  customerPhone: string;
  discount: number;
  shippingFee: number;
  total: number;
  slip: string;
  createdAt: string;
  updatedAt: string;
  items: BillItem[];
}
