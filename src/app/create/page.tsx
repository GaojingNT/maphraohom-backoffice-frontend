import BillFormView from "@/components/bills/bill-form-view";
import { getStores } from "@/lib/api/stores";

export default async function CreateBillPage() {
  const stores = await getStores();
  return <BillFormView stores={stores} />;
}
