import Link from "next/link";
import { ChevronRight, Store as StoreIcon } from "lucide-react";
import { getStores } from "@/lib/api/stores";

// Settings landing page — currently just links into each store's profile
// (name/logo/signature/address/phone). Add more settings sections here as
// they're built.
export default async function AdminPage() {
  const stores = await getStores();

  return (
    <div className="flex flex-1 flex-col pb-24">
      <div className="border-b-2 border-divider px-5 pt-[26px] pb-4">
        <div className="text-[10px] leading-none font-semibold tracking-[.18em] text-accent uppercase">
          ตั้งค่าร้าน
        </div>
        <h1 className="mt-2.5 text-[30px] leading-[1.15] font-bold tracking-[-.01em]">
          จัดการ
        </h1>
      </div>

      <div className="border-b-2 border-divider bg-surface">
        <div className="px-5 pt-4 pb-3 text-[10px] font-semibold tracking-[.14em] text-ink/50 uppercase">
          ข้อมูลร้านค้า
        </div>
        {stores.map((store) => (
          <Link
            key={store.id}
            href={`/admin/store/${store.id}`}
            className="flex items-center gap-3 border-t border-ink/13 px-5 py-4"
          >
            {store.logo ? (
              <div
                className="h-11 w-11 flex-none border border-divider bg-cover bg-center"
                style={{ backgroundImage: `url("${store.logo}")` }}
              />
            ) : (
              <div className="flex h-11 w-11 flex-none items-center justify-center border border-divider bg-bg text-ink/35">
                <StoreIcon size={18} strokeWidth={1.6} />
              </div>
            )}
            <div className="min-w-0 flex-1">
              <div className="truncate text-[14.5px] font-semibold">
                {store.name}
              </div>
              <div className="mt-0.5 text-[11.5px] text-ink/50">
                แก้ไขชื่อ โลโก้ ลายเซ็น ที่อยู่ เบอร์โทร
              </div>
            </div>
            <ChevronRight size={16} className="flex-none text-ink/35" />
          </Link>
        ))}
      </div>
    </div>
  );
}
