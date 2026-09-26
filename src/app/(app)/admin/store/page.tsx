import Link from "next/link";
import { ChevronRight, Store as StoreIcon } from "lucide-react";
import { getStores } from "@/lib/api/stores";
import TopBar, { PageHeading } from "@/components/ui/top-bar";

export default async function StoreListPage() {
  const stores = await getStores();

  return (
    <div className="flex flex-1 flex-col pb-24">
      <TopBar backHref="/admin" />
      <div className="flex flex-col gap-4 px-4">
        <PageHeading eyebrow="ตั้งค่าร้าน" title="จัดการร้านค้า" />
        {stores.length > 0 ? (
          <div className="mk-rows">
            {stores.map((store) => (
              <Link
                key={store.id}
                href={`/admin/store/${store.id}`}
                className="mk-menurow"
              >
                <span className="mk-logotile">
                  {store.logo ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={store.logo} alt="" />
                  ) : (
                    <StoreIcon />
                  )}
                </span>
                <span className="mk-menurow__t">
                  <b className="truncate">{store.name}</b>
                  <small>แก้ไขชื่อ โลโก้ ที่อยู่ เบอร์โทร</small>
                </span>
                <ChevronRight className="mk-billrow__chev" />
              </Link>
            ))}
          </div>
        ) : (
          <div className="mk-card">
            <div className="mk-empty">
              <div className="mk-empty__ic">
                <StoreIcon />
              </div>
              <h3>ยังไม่มีร้าน</h3>
              <p>บัญชีนี้ยังไม่ได้เป็นเจ้าของร้านใด</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
