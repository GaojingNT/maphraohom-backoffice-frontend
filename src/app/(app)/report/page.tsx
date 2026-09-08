import ReportView from "@/components/reports/report-view";
import { getBills } from "@/lib/api/bills";
import { getStores } from "@/lib/api/stores";

export default async function ReportPage() {
  const [bills, stores] = await Promise.all([getBills(), getStores()]);
  return <ReportView bills={bills} stores={stores} />;
}
