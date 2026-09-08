import { notFound } from "next/navigation";
import BillFormView from "@/components/bills/bill-form-view";
import { getBill } from "@/lib/api/bills";
import { getStoreProducts, getStores } from "@/lib/api/stores";

export default async function EditBillPage(
  props: PageProps<"/bills/[id]/edit">,
) {
  const { id } = await props.params;
  const billId = Number(id);
  if (!Number.isInteger(billId)) notFound();

  let bill;
  try {
    bill = await getBill(billId);
  } catch {
    notFound();
  }

  const [stores, initialProducts] = await Promise.all([
    getStores(),
    getStoreProducts(bill.storeId),
  ]);

  return (
    <BillFormView
      stores={stores}
      editingBill={bill}
      initialProducts={initialProducts}
    />
  );
}
