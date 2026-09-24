import CreateBillGuard from "@/components/bills/create-bill-guard";
import { getStores } from "@/lib/api/stores";
import { getProducts } from "@/lib/api/products";

export default async function CreateBillPage(props: PageProps<"/create">) {
  const searchParams = await props.searchParams;
  const rawType = searchParams.type;
  const initialType = Array.isArray(rawType) ? rawType[0] : rawType;

  const [stores, products] = await Promise.all([getStores(), getProducts()]);

  return (
    <CreateBillGuard initialType={initialType} stores={stores} products={products} />
  );
}
