"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowDown,
  ArrowUp,
  Check,
  ChevronLeft,
  Copy,
  Ellipsis,
  ExternalLink,
  Link2,
  Maximize,
  Paperclip,
  Pencil,
  Phone,
  Printer,
  Share2,
  Store as StoreIcon,
  Trash2,
  TriangleAlert,
  UserRound,
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
import { ConfirmDelete } from "@/components/ui/overlay";
import type { Bill } from "@/lib/types";

// The user agent never changes, so there's nothing to subscribe to.
const subscribe = () => () => {};
const getBrowser = (): InAppBrowser => detectInAppBrowser(navigator.userAgent);
const getServerBrowser = (): InAppBrowser => null;

async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

export default function BillDetailView({ bill: initialBill }: { bill: Bill }) {
  const router = useRouter();
  const { showToast } = useToast();
  const [bill, setBill] = useState(initialBill);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [printHelpOpen, setPrintHelpOpen] = useState(false);
  const [lightboxRequest, setLightboxRequest] = useState(0);
  const menuRef = useRef<HTMLDivElement>(null);
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
  const creatorName = bill.createdBy
    ? [bill.createdBy.firstName, bill.createdBy.lastName]
        .filter(Boolean)
        .join(" ")
    : "";

  // Close the ⋯ menu on an outside tap or Esc.
  useEffect(() => {
    if (!menuOpen) return;
    function onPointer(e: PointerEvent) {
      if (!menuRef.current?.contains(e.target as Node)) setMenuOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setMenuOpen(false);
    }
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [menuOpen]);

  function goBack() {
    // Back through history keeps the list where the owner left it; a detail
    // page opened straight from a link has nothing behind it.
    if (window.history.length > 1) router.back();
    else router.push("/");
  }

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

  async function handleShare() {
    const url = window.location.href;
    const title = `${config.title} ${bill.receiptNo} · ${bill.customerName}`;
    if (navigator.share) {
      try {
        await navigator.share({
          title,
          text: `${title} · ${formatBaht(bill.total)}`,
          url,
        });
      } catch {
        // Cancelled from the share sheet — nothing to report.
      }
      return;
    }
    showToast(
      (await copyText(url)) ? "คัดลอกลิงก์บิลแล้ว" : "คัดลอกลิงก์ไม่สำเร็จ",
      "info",
    );
  }

  async function handleCopyLink() {
    setMenuOpen(false);
    showToast(
      (await copyText(window.location.href))
        ? "คัดลอกลิงก์บิลแล้ว"
        : "คัดลอกลิงก์ไม่สำเร็จ",
      "info",
    );
  }

  async function handleCopyAddress() {
    showToast(
      (await copyText(bill.customerAddress))
        ? "คัดลอกที่อยู่แล้ว"
        : "คัดลอกไม่สำเร็จ",
      "info",
    );
  }

  const docRows: { label: string; value: string }[] = [
    { label: "รหัสบิล", value: `#${bill.id}` },
    { label: "ร้าน", value: bill.storeName || "—" },
    { label: "สร้างเมื่อ", value: formatDateFull(bill.createdAt) },
    ...(creatorName ? [{ label: "ออกโดย", value: creatorName }] : []),
    ...(bill.editedAt
      ? [{ label: "แก้ไขล่าสุด", value: formatDateFull(bill.editedAt) }]
      : []),
  ];

  const printLabel =
    inAppBrowser === "line"
      ? "พิมพ์ใน Safari/Chrome"
      : inAppBrowser === "other"
        ? "วิธีพิมพ์ / PDF"
        : `พิมพ์${config.documentTitle}`;

  return (
    <div className={`flex flex-1 flex-col ${config.theme}`}>
      <div className="mk-topbar">
        <button type="button" onClick={goBack} className="mk-back">
          <ChevronLeft />
          กลับ
        </button>
        <div className="flex items-center gap-2">
          <Link
            href={`/bills/${bill.id}/edit`}
            className="mk-btn mk-btn--outline"
          >
            <Pencil />
            แก้ไข
          </Link>
          <div ref={menuRef} className="relative">
            <button
              type="button"
              aria-label="ตัวเลือกเพิ่มเติม"
              aria-haspopup="menu"
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen((v) => !v)}
              className="mk-iconbtn"
            >
              <Ellipsis />
            </button>
            {menuOpen && (
              <div
                role="menu"
                className="mk-card absolute top-full right-0 z-30 mt-1.5 w-[220px] p-1.5 shadow-raised"
              >
                <button
                  type="button"
                  role="menuitem"
                  onClick={handleCopyLink}
                  className="mk-btn mk-btn--ghost mk-btn--block justify-start!"
                >
                  <Link2 />
                  คัดลอกลิงก์บิล
                </button>
                {bill.slipUrl && (
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      setMenuOpen(false);
                      setLightboxRequest((n) => n + 1);
                    }}
                    className="mk-btn mk-btn--ghost mk-btn--block justify-start!"
                  >
                    <Maximize />
                    ดูสลิปเต็มจอ
                  </button>
                )}
                <div className="my-1 h-px bg-line" />
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setMenuOpen(false);
                    setConfirmDeleteOpen(true);
                  }}
                  className="mk-btn mk-btn--danger-ghost mk-btn--block justify-start!"
                >
                  <Trash2 />
                  ลบบิลนี้
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-3 px-4 pb-6">
        {/* ① Hero — type, number, the amount and its status at a glance */}
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
          <div className="num mt-2.5 text-[34px] leading-10 font-bold text-(--type-text)">
            {formatBaht(bill.total)}
          </div>
          <h2 className="mk-h2 mt-0.5">{bill.customerName}</h2>
          <div className="mt-2.5 flex flex-wrap gap-1.5">
            {bill.slipUrl ? (
              <span className="mk-badge bg-receipt-100! text-receipt-600!">
                <Check strokeWidth={3} />
                แนบสลิปแล้ว
              </span>
            ) : (
              <span className="mk-badge bg-warning-100! text-warning-700!">
                <Paperclip />
                ยังไม่มีสลิป
              </span>
            )}
            {bill.storeName && (
              <span className="mk-badge bg-white/70!">
                <StoreIcon />
                {bill.storeName}
              </span>
            )}
            {creatorName && (
              <span className="mk-badge bg-white/70!">
                <UserRound />
                ออกโดย {creatorName}
              </span>
            )}
          </div>
        </div>

        {/* ② Slip right under the hero — the thing owners come here for */}
        <SlipPanel
          billId={bill.id}
          receiptNo={bill.receiptNo}
          slipUrl={bill.slipUrl}
          slipUploadedAt={bill.slipUploadedAt ?? null}
          lightboxRequest={lightboxRequest}
          onChange={(slipUrl) =>
            setBill((b) => ({
              ...b,
              slipUrl,
              slipUploadedAt: slipUrl ? new Date().toISOString() : null,
            }))
          }
        />

        {/* ③ One receipt-shaped card: items → adjustments → net */}
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
          <div className="mk-sumrows mt-1 border-t border-dashed border-line-strong pt-2.5">
            <div>
              <span>ยอดรวมสินค้า</span>
              <span className="num">{formatBaht(itemsSubtotal)}</span>
            </div>
            <div>
              <span>ส่วนลด</span>
              <span className="num">
                {toNumber(bill.discount)
                  ? `− ${formatBaht(bill.discount)}`
                  : "฿0"}
              </span>
            </div>
            <div>
              <span>ค่าจัดส่ง</span>
              <span className="num">
                {toNumber(bill.shippingFee)
                  ? `+ ${formatBaht(bill.shippingFee)}`
                  : "฿0"}
              </span>
            </div>
            <div className="is-total">
              <span>
                ยอดสุทธิ
                {quantitySummary && (
                  <span className="mk-caption block font-normal">
                    {quantitySummary}
                  </span>
                )}
              </span>
              <span className="num text-[22px]!">{formatBaht(bill.total)}</span>
            </div>
          </div>
        </div>

        {/* ④ Party — tap to call, copy the address */}
        <div className="mk-card mk-card__pad">
          <div className="flex items-baseline justify-between">
            <h2 className="mk-title">{config.partyLabel}</h2>
            {bill.customerId != null && (
              <span className="mk-caption num">C{bill.customerId}</span>
            )}
          </div>
          {bill.customerAddress && (
            <div className="mt-2 flex items-start gap-3">
              <div className="min-w-0 flex-1 text-[14px] leading-[21px]">
                {bill.customerAddress}
              </div>
              <button
                type="button"
                aria-label="คัดลอกที่อยู่"
                onClick={handleCopyAddress}
                className="mk-iconbtn"
              >
                <Copy size={18} />
              </button>
            </div>
          )}
          {bill.customerPhone ? (
            <a
              href={`tel:${bill.customerPhone.replace(/[^0-9+]/g, "")}`}
              className="mk-btn mk-btn--outline mk-btn--block mt-2.5 justify-start! text-ocean-700!"
            >
              <Phone />
              <span className="num">{bill.customerPhone}</span>
              <span className="mk-caption ml-auto">แตะเพื่อโทร</span>
            </a>
          ) : (
            <div className="mk-caption mt-2">ไม่มีเบอร์โทรศัพท์</div>
          )}
        </div>

        {/* ⑤ Document facts, trimmed */}
        <div className="mk-card px-4 py-1.5">
          <dl className="mk-dl">
            {docRows.map((row) => (
              <div key={row.label}>
                <dt>{row.label}</dt>
                <dd className="num">{row.value}</dd>
              </div>
            ))}
          </dl>
        </div>

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
          onClick={() => setConfirmDeleteOpen(true)}
          className="mk-btn mk-btn--danger-ghost mk-btn--block"
        >
          <Trash2 />
          ลบบิลนี้
        </button>
      </div>

      {/* ⑥ Sticky actions — share (into LINE) + print, always in reach */}
      <div className="mk-footer mt-auto gap-2.5!">
        <button
          type="button"
          onClick={handleShare}
          className="mk-btn mk-btn--outline mk-btn--lg"
        >
          <Share2 />
          แชร์
        </button>
        <button
          type="button"
          onClick={handlePrint}
          className="mk-btn mk-btn--type mk-btn--lg flex-1"
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
