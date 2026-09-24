import { notFound } from "next/navigation";
import BillFormView from "@/components/bills/bill-form-view";
import { getBill } from "@/lib/api/bills";
import { getProducts } from "@/lib/api/products";
import { getStores } from "@/lib/api/stores";

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

  const [stores, products] = await Promise.all([getStores(), getProducts()]);

  return (
    <BillFormView
      type={bill.type}
      stores={stores}
      products={products}
      editingBill={bill}
    />
  );
}
