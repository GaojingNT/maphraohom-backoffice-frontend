import { Settings2 } from "lucide-react";

// Price-per-store and promotion management were removed — pricing is now
// entered manually on every bill (see /create). This page is a placeholder
// until there's another store-settings screen to put here.
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

      <div className="flex flex-1 flex-col items-center justify-center gap-3 px-8 text-center text-ink/45">
        <Settings2 size={28} strokeWidth={1.6} />
        <p className="text-[13px] leading-[1.6] font-semibold">
          ยังไม่มีรายการตั้งค่าในตอนนี้
        </p>
      </div>
    </div>
  );
}
