import PromotionAdminView from "@/components/admin/promotion-admin-view";
import { getProducts } from "@/lib/api/products";
import { getStores } from "@/lib/api/stores";

export default async function AdminPromotionsPage() {
  const [stores, products] = await Promise.all([getStores(), getProducts()]);
  return <PromotionAdminView stores={stores} products={products} />;
}
