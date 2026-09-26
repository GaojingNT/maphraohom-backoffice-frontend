"use client";

import { useState, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowDown,
  ArrowUp,
  ExternalLink,
  Pencil,
  Printer,
  Trash2,
  TriangleAlert,
} from "lucide-react";
import { deleteBill } from "@/lib/api/bills";
import { BILL_TYPE_CONFIG } from "@/lib/bill-type";
import {
  formatBaht,
  formatDateFull,
  formatQuantity,
  formatQuantityByUnit,
} from "@/lib/format";
import { toNumber } from "@/lib/money";
import {
  detectInAppBrowser,
  externalBrowserUrl,
  type InAppBrowser,
} from "@/lib/in-app-browser";
import { useToast } from "@/components/toast-provider";
import SlipPanel from "@/components/bills/slip-panel";
import TopBar from "@/components/ui/top-bar";
import { ConfirmDelete } from "@/components/ui/overlay";
import type { Bill } from "@/lib/types";

// The user agent never changes, so there's nothing to subscribe to.
const subscribe = () => () => {};
const getBrowser = (): InAppBrowser => detectInAppBrowser(navigator.userAgent);
const getServerBrowser = (): InAppBrowser => null;

export default function BillDetailView({ bill: initialBill }: { bill: Bill }) {
  const router = useRouter();
  const { showToast } = useToast();
  const [bill, setBill] = useState(initialBill);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [printHelpOpen, setPrintHelpOpen] = useState(false);
  const inAppBrowser = useSyncExternalStore(
    subscribe,
    getBrowser,
    getServerBrowser,
  );
  const config = BILL_TYPE_CONFIG[bill.type];
  const Arrow = bill.type === "receipt" ? ArrowDown : ArrowUp;

  const itemsSubtotal = bill.items.reduce(
    (a, it) => a + toNumber(it.subtotal),
    0,
  );
  const quantitySummary = formatQuantityByUnit(bill.items);
  const printHref = `/bills/export/receipt?ids=${bill.id}`;

  async function handleDelete() {
    setDeleting(true);
    try {
      await deleteBill(bill.id);
      showToast(`ลบบิล #${bill.receiptNo} แล้ว`);
      router.push("/");
    } catch (err) {
      setDeleting(false);
      setConfirmDeleteOpen(false);
      showToast(err instanceof Error ? err.message : "ลบบิลไม่สำเร็จ", "error");
    }
  }

  // F9: in-app browsers can't print, so the button changes by where the
  // page was opened (see lib/in-app-browser.ts).
  function handlePrint() {
    if (inAppBrowser === "other") {
      setPrintHelpOpen(true);
      return;
    }
    if (inAppBrowser === "line") {
      window.location.assign(
        externalBrowserUrl(new URL(printHref, window.location.href).toString()),
      );
      return;
    }
    router.push(printHref);
  }

  const infoRows: { label: string; value: string }[] = [
    { label: "รหัสบิล", value: `#${bill.id}` },
    { label: "ร้าน", value: bill.storeName || "—" },
    {
      label: `รหัส${config.partyLabel}`,
      value: bill.customerId != null ? `C${bill.customerId}` : "—",
    },
    {
      label: `เบอร์โทรศัพท์${config.partyLabel}`,
      value: bill.customerPhone || "—",
    },
    { label: "จำนวนรวม", value: quantitySummary || "—" },
    { label: "ยอดรวมสินค้า", value: formatBaht(itemsSubtotal) },
    {
      label: "ส่วนลด",
      value: toNumber(bill.discount) ? `− ${formatBaht(bill.discount)}` : "—",
    },
    {
      label: "ค่าจัดส่ง",
      value: toNumber(bill.shippingFee)
        ? `+ ${formatBaht(bill.shippingFee)}`
        : "—",
    },
    { label: "สร้างเมื่อ", value: formatDateFull(bill.createdAt) },
    { label: "แก้ไขล่าสุด", value: formatDateFull(bill.updatedAt) },
  ];

  const printLabel =
    inAppBrowser === "line"
      ? "พิมพ์ใน Safari/Chrome"
      : inAppBrowser === "other"
        ? "วิธีพิมพ์ / PDF"
        : `พิมพ์${config.documentTitle}`;

  return (
    <div className={`flex flex-1 flex-col pb-24 ${config.theme}`}>
      <TopBar backHref="/">
        <div className="flex items-center gap-2">
          <Link
            href={`/bills/${bill.id}/edit`}
            className="mk-btn mk-btn--outline"
          >
            <Pencil />
            แก้ไข
          </Link>
          <button
            type="button"
            aria-label="ลบบิล"
            onClick={() => setConfirmDeleteOpen(true)}
            className="mk-iconbtn mk-iconbtn--danger"
          >
            <Trash2 />
          </button>
        </div>
      </TopBar>

      <div className="flex flex-col gap-4 px-4 pb-8">
        <div className="mk-hero">
          <div className="flex items-center">
            <span className="mk-hero__type">
              <Arrow strokeWidth={2.4} />
              {config.title}
            </span>
            <span className="mk-hero__no">
              เล่มที่ {bill.bookNo} · เลขที่ {bill.receiptNo}
            </span>
          </div>
          <h2 className="mk-h2 mt-2.5">{bill.customerName}</h2>
          <div className="mk-caption text-[13px]!">{bill.customerAddress}</div>
        </div>

        <div className="mk-card mk-total">
          <div className="mk-caption">ยอดสุทธิ</div>
          <div className="amt">{formatBaht(bill.total)}</div>
          <div className="mk-caption text-[13px]!">
            {bill.storeName ? `${bill.storeName} · ` : ""}
            {bill.items.length} รายการ
            {quantitySummary ? ` · ${quantitySummary}` : ""}
          </div>
        </div>

        <div className="mk-card mk-card__pad">
          <div className="flex items-baseline justify-between">
            <h2 className="mk-title">รายการสินค้า</h2>
            <span className="mk-caption">{bill.items.length} รายการ</span>
          </div>
          <div className="mk-lines">
            {bill.items.map((it) => (
              <div key={it.id}>
                <div className="min-w-0">
                  <b>{it.productName}</b>
                  <div className="mk-caption num">
                    {formatQuantity(it.quantity, it.unit)} ×{" "}
                    {formatBaht(it.price)}/{it.unit}
                  </div>
                </div>
                <span className="num font-semibold whitespace-nowrap">
                  {formatBaht(it.subtotal)}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="mk-card px-4 py-1.5">
          <dl className="mk-dl">
            {infoRows.map((row) => (
              <div key={row.label}>
                <dt>{row.label}</dt>
                <dd className="num">{row.value}</dd>
              </div>
            ))}
          </dl>
        </div>

        <SlipPanel
          billId={bill.id}
          receiptNo={bill.receiptNo}
          slipUrl={bill.slipUrl}
          onChange={(slipUrl) => setBill((b) => ({ ...b, slipUrl }))}
        />

        {printHelpOpen && (
          <div className="mk-alert mk-alert--warning" role="status">
            <TriangleAlert />
            <span>
              แอปนี้พิมพ์จากหน้าเว็บไม่ได้ — กดเมนู <b>⋯</b> มุมขวาบน แล้วเลือก{" "}
              <b>‘เปิดในเบราว์เซอร์’</b> จากนั้นกดพิมพ์อีกครั้ง
            </span>
          </div>
        )}

        <button
          type="button"
          onClick={handlePrint}
          className="mk-btn mk-btn--type mk-btn--lg mk-btn--block"
        >
          {inAppBrowser ? <ExternalLink /> : <Printer />}
          {printLabel}
        </button>
      </div>

      <ConfirmDelete
        open={confirmDeleteOpen}
        title={`ลบบิล ${bill.receiptNo}?`}
        body={`บิลของ ${bill.customerName} ยอด ${formatBaht(bill.total)} จะถูกลบออกจากรายการ`}
        confirmLabel="ลบบิล"
        busy={deleting}
        onConfirm={handleDelete}
        onCancel={() => setConfirmDeleteOpen(false)}
      />
    </div>
  );
}
