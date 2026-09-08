import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { notFound } from "next/navigation";
import { formatBaht } from "@/lib/format";
import { getBills } from "@/lib/api/bills";

export default async function BillDetailPage(props: PageProps<"/bills/[id]">) {
  const { id } = await props.params;
  const bills = await getBills();
  const bill = bills.find((b) => b.id === Number(id));
  if (!bill) notFound();

  return (
    <div className="flex flex-1 flex-col pb-24">
      <div className="border-b-2 border-divider bg-surface px-5 pt-4 pb-[18px]">
        <Link
          href="/"
          className="flex items-center gap-[7px] text-[13px] font-semibold text-accent"
        >
          <ChevronLeft size={16} />
          กลับ
        </Link>
      </div>
      <div className="flex flex-1 flex-col items-center justify-center gap-2 px-5 text-center">
        <div className="text-[10px] leading-none font-semibold tracking-[.18em] text-accent uppercase">
          รายละเอียดบิล #{bill.receiptNo}
        </div>
        <div className="text-[16px] font-semibold">{bill.customerName}</div>
        <div className="font-num text-[16px] font-bold">
          {formatBaht(bill.total)}
        </div>
        <p className="text-[13px] text-ink/55">
          หน้ารายละเอียดฉบับเต็มอยู่ระหว่างพัฒนา — จะตามมาในรอบถัดไป
        </p>
      </div>
    </div>
  );
}
