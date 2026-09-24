"use client";

import { useRouter } from "next/navigation";
import BillTypeSheet from "@/components/bills/bill-type-sheet";
import BillFormView from "@/components/bills/bill-form-view";
import { isValidBillType } from "@/lib/bill-type";
import type { ProductListItem } from "@/lib/api/products";
import type { Store } from "@/lib/types";

// Guards /create: `type` must be "receipt" or "payment" — never silently
// default to receipt, since that would issue the wrong kind of document
// without the user noticing. An invalid/missing type forces the same
// BillTypeSheet used by the bottom nav open right here; picking a type
// replaces the URL's query param (no back-button entry added), and
// dismissing without picking sends the user home — there's nothing useful
// to show on /create without a type.
export default function CreateBillGuard({
  initialType,
  stores,
  products,
}: {
  initialType: string | undefined;
  stores: Store[];
  products: ProductListItem[];
}) {
  const router = useRouter();

  if (!isValidBillType(initialType)) {
    return (
      <BillTypeSheet
        open
        onClose={() => router.push("/")}
        onSelect={(type) => router.replace(`/create?type=${type}`)}
      />
    );
  }

  return <BillFormView type={initialType} stores={stores} products={products} />;
}
