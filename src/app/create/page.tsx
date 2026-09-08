import CreateBillView from "@/components/bills/create-bill-view";
import { getStores } from "@/lib/api/stores";

export default async function CreateBillPage() {
  const stores = await getStores();
  return <CreateBillView stores={stores} />;
}
