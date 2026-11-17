import CreateBillGuard from "@/components/bills/create-bill-guard";
import { getStores } from "@/lib/api/stores";
import { getProducts } from "@/lib/api/products";
import { getPlatformTypes } from "@/lib/api/platform-types";

export default async function CreateBillPage(props: PageProps<"/create">) {
  const searchParams = await props.searchParams;
  const rawType = searchParams.type;
  const initialType = Array.isArray(rawType) ? rawType[0] : rawType;

  const [stores, products, platforms] = await Promise.all([
    getStores(),
    getProducts(),
    getPlatformTypes(),
  ]);

  return (
    <CreateBillGuard
      initialType={initialType}
      stores={stores}
      products={products}
      platforms={platforms}
    />
  );
}
