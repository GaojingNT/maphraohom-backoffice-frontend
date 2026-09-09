import { API_BASE_URL } from "@/lib/api/config";

export interface CustomerListItem {
  id: number;
  name: string;
  phone: string;
}

export interface CustomerAddressItem {
  id: number;
  address: string;
  label?: string;
  isDefault: boolean;
}

export interface CustomerPhoneItem {
  id: number;
  phone: string;
  isDefault: boolean;
}

interface CustomersPageResponse {
  data: CustomerListItem[];
}

export async function searchCustomers(
  query: string,
): Promise<CustomerListItem[]> {
  const params = new URLSearchParams({
    search: query,
    searchBy: "name",
    limit: "8",
  });
  const res = await fetch(`${API_BASE_URL}/customers?${params.toString()}`, {
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error(`GET /customers failed with status ${res.status}`);
  }
  const page: CustomersPageResponse = await res.json();
  return page.data;
}

// Ordered default-first by the backend, so [0] is the address to prefill.
export async function getCustomerAddresses(
  id: number,
): Promise<CustomerAddressItem[]> {
  const res = await fetch(`${API_BASE_URL}/customers/${id}/addresses`, {
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error(
      `GET /customers/${id}/addresses failed with status ${res.status}`,
    );
  }
  return res.json();
}

// Ordered default-first by the backend, so [0] is the phone to prefill.
export async function getCustomerPhones(
  id: number,
): Promise<CustomerPhoneItem[]> {
  const res = await fetch(`${API_BASE_URL}/customers/${id}/phones`, {
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error(
      `GET /customers/${id}/phones failed with status ${res.status}`,
    );
  }
  return res.json();
}
