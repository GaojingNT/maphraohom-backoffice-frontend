import { API_BASE_URL } from "@/lib/api/config";

export interface PromotionListItem {
  id: number;
  name: string;
  storeId: number;
  storeName: string;
  startsAt: string;
  endsAt: string;
  isActive: boolean;
  createdAt: string;
}

export interface PromotionPriceItem {
  productId: number;
  productName: string;
  price: number;
}

export interface PromotionDetail extends PromotionListItem {
  items: PromotionPriceItem[];
  updatedAt: string;
}

export async function getPromotions(
  storeId?: number,
): Promise<PromotionListItem[]> {
  const params = storeId != null ? `?storeId=${storeId}` : "";
  const res = await fetch(`${API_BASE_URL}/promotions${params}`, {
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error(`GET /promotions failed with status ${res.status}`);
  }
  return res.json();
}

export interface CreatePromotionItemInput {
  productId: number;
  price: number;
}

export interface CreatePromotionInput {
  name: string;
  storeId: number;
  startsAt: string;
  endsAt: string;
  items: CreatePromotionItemInput[];
}

export async function createPromotion(
  input: CreatePromotionInput,
): Promise<PromotionDetail> {
  const res = await fetch(`${API_BASE_URL}/promotions`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    const body: { message?: string } | null = await res
      .json()
      .catch(() => null);
    throw new Error(
      body?.message ?? `POST /promotions failed with status ${res.status}`,
    );
  }
  return res.json();
}

export async function getPromotion(id: number): Promise<PromotionDetail> {
  const res = await fetch(`${API_BASE_URL}/promotions/${id}`, {
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error(`GET /promotions/${id} failed with status ${res.status}`);
  }
  return res.json();
}

export async function updatePromotion(
  id: number,
  input: CreatePromotionInput,
): Promise<PromotionDetail> {
  const res = await fetch(`${API_BASE_URL}/promotions/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    const body: { message?: string } | null = await res
      .json()
      .catch(() => null);
    throw new Error(
      body?.message ?? `PUT /promotions/${id} failed with status ${res.status}`,
    );
  }
  return res.json();
}

export async function deletePromotion(id: number): Promise<void> {
  const res = await fetch(`${API_BASE_URL}/promotions/${id}`, {
    method: "DELETE",
  });
  if (!res.ok) {
    const body: { message?: string } | null = await res
      .json()
      .catch(() => null);
    throw new Error(
      body?.message ?? `DELETE /promotions/${id} failed with status ${res.status}`,
    );
  }
}
