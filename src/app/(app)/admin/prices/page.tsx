import PriceAdminView from "@/components/admin/price-admin-view";
import { getStores } from "@/lib/api/stores";

export default async function AdminPricesPage() {
  const stores = await getStores();
  return <PriceAdminView stores={stores} />;
}
