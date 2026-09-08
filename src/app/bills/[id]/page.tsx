import { notFound } from "next/navigation";
import BillDetailView from "@/components/bills/bill-detail-view";
import { getBill } from "@/lib/api/bills";

export default async function BillDetailPage(props: PageProps<"/bills/[id]">) {
  const { id } = await props.params;
  const billId = Number(id);
  if (!Number.isInteger(billId)) notFound();

  let bill;
  try {
    bill = await getBill(billId);
  } catch {
    notFound();
  }

  return <BillDetailView bill={bill} />;
}
