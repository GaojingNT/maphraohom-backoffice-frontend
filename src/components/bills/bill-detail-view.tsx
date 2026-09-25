"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ChevronLeft, Pencil, Printer, Trash2 } from "lucide-react";
import { deleteBill } from "@/lib/api/bills";
import { BILL_TYPE_CONFIG } from "@/lib/bill-type";
import { formatBaht, formatDateFull, formatQuantity, formatQuantityByUnit } from "@/lib/format";
import { toNumber } from "@/lib/money";
import { useToast } from "@/components/toast-provider";
import SlipPanel from "@/components/bills/slip-panel";
import type { Bill } from "@/lib/types";
import OverlayPortal from "@/components/overlay-portal";

export default function BillDetailView({ bill: initialBill }: { bill: Bill }) {
  const router = useRouter();
  const { showToast } = useToast();
  const [bill, setBill] = useState(initialBill);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const config = BILL_TYPE_CONFIG[bill.type];

  const itemsSubtotal = bill.items.reduce((a, it) => a + toNumber(it.subtotal), 0);
  const quantitySummary = formatQuantityByUnit(bill.items);

  async function handleDelete() {
    setDeleting(true);
    try {
      await deleteBill(bill.id);
      showToast(`ลบบิล #${bill.receiptNo} แล้ว`);
      router.push("/");
    } catch (err) {
      setDeleting(false);
      setConfirmDeleteOpen(false);
      showToast(err instanceof Error ? err.message : "ลบบิลไม่สำเร็จ");
    }
  }

  const infoRows: { label: string; value: string }[] = [
    { label: "รหัสบิล", value: `#${bill.id}` },
    { label: "สาขา", value: bill.storeName || "—" },
    {
      label: `รหัส${config.partyLabel}`,
      value: bill.customerId != null ? `C${bill.customerId}` : "—",
    },
    { label: `เบอร์โทรศัพท์${config.partyLabel}`, value: bill.customerPhone || "—" },
    { label: "จำนวนรวม", value: quantitySummary || "—" },
    { label: "ยอดรวมสินค้า", value: formatBaht(itemsSubtotal) },
    {
      label: "ส่วนลด",
      value: toNumber(bill.discount) ? `− ${formatBaht(bill.discount)}` : "—",
    },
    {
      label: "ค่าจัดส่ง",
      value: toNumber(bill.shippingFee) ? `+ ${formatBaht(bill.shippingFee)}` : "—",
    },
    { label: "สร้างเมื่อ", value: formatDateFull(bill.createdAt) },
    { label: "แก้ไขล่าสุด", value: formatDateFull(bill.updatedAt) },
  ];

  return (
    <>
      <div className="flex flex-1 flex-col pb-24 [animation:riseIn_0.22s_ease_both]">
        {/* Top bar */}
        <div className="border-b-2 border-divider bg-surface px-5 pt-4 pb-[18px]">
          <div className="flex items-center justify-between">
            <Link
              href="/"
              className={`flex items-center gap-[7px] py-2.5 pr-2.5 text-[13px] font-semibold ${config.color.text}`}
            >
              <ChevronLeft size={16} />
              กลับ
            </Link>
            <div className="flex gap-1">
              <Link
                href={`/bills/${bill.id}/edit`}
                className="flex h-10 items-center gap-1.5 border border-divider bg-transparent px-3 text-[12px] font-semibold"
              >
                <Pencil size={14} />
                แก้ไข
              </Link>
              <button
                type="button"
                onClick={() => setConfirmDeleteOpen(true)}
                className="flex h-10 w-10 items-center justify-center border border-divider bg-transparent text-danger"
              >
                <Trash2 size={15} />
              </button>
            </div>
          </div>
          <div
            className={`mt-3 inline-flex items-center gap-1.5 px-2 py-1 text-[10px] font-bold tracking-[.08em] uppercase ${config.color.bgSoft} ${config.color.text}`}
          >
            {config.title}
          </div>
          <div className="font-num mt-2 text-[10px] tracking-[.1em] text-ink/50">
            เล่มที่ {bill.bookNo} · เลขที่ {bill.receiptNo}
          </div>
          <h2 className="mt-2.5 text-[26px] leading-[1.25] font-bold">
            {bill.customerName}
          </h2>
          <div className="mt-1.5 text-[13px] leading-[1.5] text-ink/60">
            {bill.customerAddress}
          </div>
        </div>

        {/* Total block */}
        <div className={`border-b-2 border-divider px-5 py-5 text-white ${config.color.bg}`}>
          <div className="text-[10px] leading-none font-semibold tracking-[.18em] uppercase opacity-90">
            ยอดสุทธิ
          </div>
          <div className="font-num mt-3 text-[42px] leading-none font-bold tracking-[-.02em]">
            {formatBaht(bill.total)}
          </div>
          <div className="mt-2.5 text-[12px] leading-[1.4] font-medium">
            {bill.storeName ? `${bill.storeName} · ` : ""}
            {bill.items.length} รายการ
            {quantitySummary ? ` · ${quantitySummary}` : ""}
          </div>
        </div>

        {/* Items table */}
        <div className="border-b-2 border-divider bg-surface">
          <div className="flex items-baseline justify-between gap-3 px-5 pt-4 pb-3">
            <div className="text-[10px] font-semibold tracking-[.14em] text-ink/50 uppercase">
              รายการสินค้า
            </div>
            <div className="font-num text-[10.5px] text-ink/50">
              {bill.items.length} รายการ
            </div>
          </div>
          {bill.items.map((it) => (
            <div
              key={it.id}
              className="grid grid-cols-[1fr_auto] items-baseline gap-3 border-t border-ink/13 px-5 py-3"
            >
              <div className="min-w-0">
                <div className="text-[13.5px] leading-[1.4] font-semibold">
                  {it.productName}
                </div>
                <div className="font-num mt-1 text-[11px] text-ink/50">
                  {formatQuantity(it.quantity, it.unit)} × {formatBaht(it.price)}/
                  {it.unit}
                </div>
              </div>
              <div className="font-num text-[14.5px] font-bold whitespace-nowrap">
                {formatBaht(it.subtotal)}
              </div>
            </div>
          ))}
        </div>

        {/* Info table */}
        <div className="border-b-2 border-divider bg-surface">
          {infoRows.map((row) => (
            <div
              key={row.label}
              className="flex items-baseline justify-between gap-4 border-b border-ink/13 px-5 py-[13px] last:border-b-0"
            >
              <div className="text-[12px] font-medium text-ink/55 whitespace-nowrap">
                {row.label}
              </div>
              <div className="text-right text-[14px] font-semibold">
                {row.value}
              </div>
            </div>
          ))}
        </div>

        <SlipPanel
          billId={bill.id}
          receiptNo={bill.receiptNo}
          slipUrl={bill.slipUrl}
          onChange={(slipUrl) => setBill((b) => ({ ...b, slipUrl }))}
        />

        {/* Print */}
        <div className="px-5 py-[18px]">
          <Link
            href={`/bills/export/receipt?ids=${bill.id}`}
            className={`flex min-h-[52px] w-full items-center justify-center gap-2 text-[15px] font-semibold text-white ${config.color.bg}`}
          >
            <Printer size={17} />
            พิมพ์{config.documentTitle}
          </Link>
        </div>
      </div>

      {/* Delete confirm dialog */}
      {confirmDeleteOpen && (
        <OverlayPortal>
          <div className="fixed inset-0 z-[70] flex items-end justify-center bg-[rgba(10,16,12,0.55)] [animation:fadeIn_0.16s_ease_both]">
            <div className="w-full max-w-[430px] border-t-2 border-divider bg-surface px-5 pt-6 pb-7 [animation:riseIn_0.2s_ease_both]">
              <h3 className="text-[20px] leading-[1.3] font-bold">
                ลบบิล {bill.receiptNo}?
              </h3>
              <p className="mt-2.5 mb-5 text-[13px] leading-[1.6] text-ink/60">
                บิลของ {bill.customerName} ยอด {formatBaht(bill.total)}{" "}
                จะถูกลบออกจากรายการ
              </p>
              <div className="flex gap-2.5">
                <button
                  type="button"
                  onClick={() => setConfirmDeleteOpen(false)}
                  disabled={deleting}
                  className="min-h-[50px] flex-1 border border-divider bg-transparent text-[14px] font-semibold disabled:opacity-60"
                >
                  ยกเลิก
                </button>
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={deleting}
                  className="min-h-[50px] flex-1 bg-danger text-[14px] font-semibold text-white disabled:opacity-60"
                >
                  {deleting ? "กำลังลบ…" : "ลบบิล"}
                </button>
              </div>
            </div>
          </div>
        </OverlayPortal>
      )}
    </>
  );
}
