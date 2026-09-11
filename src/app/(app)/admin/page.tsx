import Link from "next/link";
import { ChevronRight, Percent, Tag } from "lucide-react";

const LINKS = [
  {
    href: "/admin/prices",
    icon: Tag,
    title: "จัดการราคา",
    desc: "แก้ราคาต่อหน่วยของแต่ละสินค้า แยกตามสาขา",
  },
  {
    href: "/admin/promotions",
    icon: Percent,
    title: "จัดการโปรโมชั่น",
    desc: "ตั้งโปรราคาพิเศษตามช่วงเวลา แยกตามสาขา",
  },
];

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

      <div className="flex flex-col">
        {LINKS.map(({ href, icon: Icon, title, desc }) => (
          <Link
            key={href}
            href={href}
            className="flex items-center gap-3.5 border-b-2 border-divider bg-surface px-5 py-5"
          >
            <div className="flex h-11 w-11 flex-none items-center justify-center border border-divider bg-accent-100 text-accent">
              <Icon size={19} strokeWidth={1.8} />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-[15px] font-bold">{title}</div>
              <div className="mt-0.5 text-[12px] leading-[1.5] text-ink/55">
                {desc}
              </div>
            </div>
            <ChevronRight size={18} className="flex-none text-ink/40" />
          </Link>
        ))}
      </div>
    </div>
  );
}
