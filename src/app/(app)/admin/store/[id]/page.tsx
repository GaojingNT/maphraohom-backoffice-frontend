import { notFound } from "next/navigation";
import StoreEditView from "@/components/admin/store-edit-view";
import { getStore } from "@/lib/api/stores";

export default async function StoreEditPage(
  props: PageProps<"/admin/store/[id]">,
) {
  const { id } = await props.params;
  const storeId = Number(id);
  if (!Number.isInteger(storeId)) notFound();

  let store;
  try {
    store = await getStore(storeId);
  } catch {
    notFound();
  }

  return <StoreEditView store={store} />;
}
