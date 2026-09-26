import Link from "next/link";
import { SearchX } from "lucide-react";

export default function NotFoundView() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center px-4 pt-16 pb-28">
      <div className="mk-empty">
        <div className="mk-empty__ic">
          <SearchX />
        </div>
        <div className="num mb-1 text-[40px] leading-none font-bold text-sand-700">
          404
        </div>
        <h3>ไม่พบหน้านี้</h3>
        <p>บิลหรือร้านนี้อาจถูกลบไปแล้ว หรือลิงก์ไม่ถูกต้อง</p>
        <Link href="/" className="mk-btn mk-btn--primary">
          กลับหน้าบิลทั้งหมด
        </Link>
      </div>
    </div>
  );
}
