"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ChevronLeft,
  ImageIcon,
  Pencil,
  Printer,
  Trash2,
  X,
} from "lucide-react";
import { deleteBill } from "@/lib/api/bills";
import { API_BASE_URL } from "@/lib/api/config";
import { formatBaht, formatDateFull, formatKg, sumKg } from "@/lib/format";
import { useToast } from "@/components/toast-provider";
import type { Bill } from "@/lib/types";

// The backend doesn't yet serve uploaded slip files over HTTP (only
// stores/reads them server-side) — this URL is a best guess at the future
// static-serving convention and will 404/broken-image until that exists.
function slipUrl(slipKey: string): string {
  return `${API_BASE_URL.replace(/\/api\/v1$/, "")}/storage/${slipKey}`;
}

export default function BillDetailView({ bill }: { bill: Bill }) {
  const router = useRouter();
  const { showToast } = useToast();
  const [slipOpen, setSlipOpen] = useState(false);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const itemsSubtotal = bill.items.reduce((a, it) => a + it.subtotal, 0);
  const weightTotal = sumKg(bill);
  const hasSlip = !!bill.slip;

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
      label: "รหัสลูกค้า",
      value: bill.customerId != null ? `C${bill.customerId}` : "—",
    },
    { label: "น้ำหนักรวม", value: formatKg(weightTotal) },
    { label: "ยอดรวมสินค้า", value: formatBaht(itemsSubtotal) },
    {
      label: "ส่วนลด",
      value: bill.discount ? `− ${formatBaht(bill.discount)}` : "—",
    },
    {
      label: "ค่าจัดส่ง",
      value: bill.shippingFee ? `+ ${formatBaht(bill.shippingFee)}` : "—",
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
              className="flex items-center gap-[7px] py-2.5 pr-2.5 text-[13px] font-semibold text-accent"
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
          <div className="font-num mt-3 text-[10px] tracking-[.1em] text-ink/50">
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
        <div className="border-b-2 border-divider bg-accent px-5 py-5 text-white">
          <div className="text-[10px] leading-none font-semibold tracking-[.18em] uppercase opacity-90">
            ยอดสุทธิ
          </div>
          <div className="font-num mt-3 text-[42px] leading-none font-bold tracking-[-.02em]">
            {formatBaht(bill.total)}
          </div>
          <div className="mt-2.5 text-[12px] leading-[1.4] font-medium">
            {bill.storeName ? `${bill.storeName} · ` : ""}
            {bill.items.length} รายการ · {formatKg(weightTotal)}
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
                  {formatKg(it.kilogram)} × {formatBaht(it.price)}/กก.
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

        {/* Slip */}
        <div className="border-b-2 border-divider px-5 py-5">
          <div className="mb-3 text-[10px] font-semibold tracking-[.14em] text-ink/50 uppercase">
            สลิปโอนเงิน
          </div>
          {hasSlip ? (
            <button
              type="button"
              onClick={() => setSlipOpen(true)}
              className="relative block h-[200px] w-full cursor-zoom-in overflow-hidden border border-divider bg-surface p-0"
            >
              <div
                role="img"
                aria-label="สลิปโอนเงิน"
                className="h-full w-full bg-cover bg-center"
                style={{ backgroundImage: `url("${slipUrl(bill.slip)}")` }}
              />
              <span className="absolute right-0 bottom-0 bg-ink px-[11px] py-[9px] text-[11px] font-semibold text-white">
                แตะเพื่อดูเต็มจอ
              </span>
            </button>
          ) : (
            <div className="flex h-[130px] flex-col items-start justify-center gap-2 border border-dashed border-divider px-[18px] text-ink/45">
              <ImageIcon size={22} strokeWidth={1.6} />
              <div className="text-[13px] font-semibold">ไม่มีสลิปแนบ</div>
            </div>
          )}
        </div>

        {/* Print */}
        <div className="px-5 py-[18px]">
          <button
            type="button"
            onClick={() => showToast("ส่งใบเสร็จเข้าคิวพิมพ์แล้ว")}
            className="flex min-h-[52px] w-full items-center justify-center gap-2 bg-accent text-[15px] font-semibold text-white"
          >
            <Printer size={17} />
            พิมพ์ใบเสร็จ
          </button>
        </div>
      </div>

      {/* Slip lightbox — rendered outside the animated container above:
          `animation` on an ancestor creates a new stacking context, which
          would otherwise trap this fixed overlay below the bottom nav. */}
      {slipOpen && hasSlip && (
        <div
          onClick={() => setSlipOpen(false)}
          className="fixed inset-0 z-[60] flex flex-col bg-[rgba(10,16,12,0.94)] [animation:fadeIn_0.18s_ease_both]"
        >
          <div className="flex items-center justify-between px-[18px] py-4 text-white">
            <div className="text-[12px] font-semibold">
              สลิป · {bill.receiptNo}
            </div>
            <button
              type="button"
              onClick={() => setSlipOpen(false)}
              className="flex h-11 w-11 items-center justify-center border border-white/35 bg-transparent text-white"
            >
              <X size={18} />
            </button>
          </div>
          <div className="flex flex-1 items-center justify-center px-4 pb-7">
            <div
              role="img"
              aria-label="สลิปเต็มจอ"
              className="h-full w-full bg-center bg-no-repeat"
              style={{
                backgroundImage: `url("${slipUrl(bill.slip)}")`,
                backgroundSize: "contain",
              }}
            />
          </div>
        </div>
      )}

      {/* Delete confirm dialog */}
      {confirmDeleteOpen && (
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
      )}
    </>
  );
}
