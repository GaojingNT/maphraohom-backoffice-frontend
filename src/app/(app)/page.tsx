import BillListView, {
  type BillListFilter,
} from "@/components/bills/bill-list-view";
import { getBills } from "@/lib/api/bills";
import { getStores } from "@/lib/api/stores";

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

// Optional ?mode=&period=&store= let the report's bars and store rows open
// the list already filtered (spec §7 #10). ?store= is also what the list's
// store chips navigate to — bills are fetched for that store server-side.
export default async function Home(props: PageProps<"/">) {
  const searchParams = await props.searchParams;
  const mode = first(searchParams.mode);
  const store = Number(first(searchParams.store));
  const stores = await getStores();
  // A ?store= that isn't one of the user's stores means every store.
  const storeId =
    Number.isInteger(store) && stores.some((s) => s.id === store)
      ? store
      : null;
  const initialFilter: BillListFilter = {
    mode: mode === "day" || mode === "month" || mode === "year" ? mode : "all",
    period: first(searchParams.period) ?? null,
    storeId,
  };
  const bills = await getBills({ storeId });
  return (
    <BillListView bills={bills} stores={stores} initialFilter={initialFilter} />
  );
}
