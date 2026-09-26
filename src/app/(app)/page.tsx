import BillListView, {
  type BillListFilter,
} from "@/components/bills/bill-list-view";
import { getBills } from "@/lib/api/bills";

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

// Optional ?mode=&period=&store= let the report's bars and store rows open
// the list already filtered (spec §7 #10).
export default async function Home(props: PageProps<"/">) {
  const searchParams = await props.searchParams;
  const mode = first(searchParams.mode);
  const store = Number(first(searchParams.store));
  const initialFilter: BillListFilter = {
    mode: mode === "day" || mode === "month" || mode === "year" ? mode : "all",
    period: first(searchParams.period) ?? null,
    storeId: Number.isInteger(store) && store > 0 ? store : null,
  };
  const bills = await getBills();
  return <BillListView bills={bills} initialFilter={initialFilter} />;
}
