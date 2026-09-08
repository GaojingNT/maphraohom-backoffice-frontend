import BillListView from "@/components/bills/bill-list-view";
import { getBills } from "@/lib/api/bills";

export default async function Home() {
  const bills = await getBills();
  return <BillListView bills={bills} />;
}
