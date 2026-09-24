import Link from "next/link";
import { ChevronRight, Store as StoreIcon } from "lucide-react";

// Settings landing page — a menu of settings sections. Add more entries here
// as they're built.
export default function AdminPage() {
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
        <Link
          href="/admin/store"
          className="flex items-center gap-3 px-5 py-4"
        >
          <div className="flex h-11 w-11 flex-none items-center justify-center border border-divider bg-bg text-ink/45">
            <StoreIcon size={18} strokeWidth={1.6} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-[14.5px] font-semibold">จัดการร้านค้า</div>
            <div className="mt-0.5 text-[11.5px] text-ink/50">
              ชื่อ โลโก้ ลายเซ็น ที่อยู่ เบอร์โทร ของแต่ละร้าน
            </div>
          </div>
          <ChevronRight size={16} className="flex-none text-ink/35" />
        </Link>
      </div>
    </div>
  );
}
