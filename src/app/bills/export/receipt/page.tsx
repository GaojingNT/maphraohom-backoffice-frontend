import ThaiBahtText from "thai-baht-text";
import ReceiptPrintToolbar from "@/components/export/receipt-print-toolbar";
import { getBill } from "@/lib/api/bills";
import { parseIds } from "@/lib/export/parse-ids";
import { formatBaht, formatDateFull, formatQuantity, formatQuantityByUnit } from "@/lib/format";
import { toNumber } from "@/lib/money";
import { BILL_TYPE_CONFIG } from "@/lib/bill-type";
import type { Bill } from "@/lib/types";

export default async function ExportReceiptPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const ids = parseIds((await searchParams).ids);

  const results = await Promise.allSettled(ids.map((id) => getBill(id)));
  const bills = results
    .filter((r): r is PromiseFulfilledResult<Bill> => r.status === "fulfilled")
    .map((r) => r.value)
    .sort(
      (a, b) =>
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
    );

  const receipts = bills.map((b) => {
    const config = BILL_TYPE_CONFIG[b.type];
    const itemsTotal = b.items.reduce((a, it) => a + toNumber(it.subtotal), 0);
    return {
      id: b.id,
      config,
      storeName: b.storeName || "—",
      bookNo: b.bookNo,
      receiptNo: b.receiptNo,
      billIdLabel: `#${b.id}`,
      customerIdLabel: b.customerId != null ? `C${b.customerId}` : "—",
      dateLabel: formatDateFull(b.createdAt),
      customerName: b.customerName,
      customerAddress: b.customerAddress,
      items: b.items.map((it, i) => ({
        id: it.id,
        no: String(i + 1).padStart(2, "0"),
        productName: it.productName,
        quantityLabel: formatQuantity(it.quantity, it.unit),
        priceLabel: `${formatBaht(it.price)}/${it.unit}`,
        subtotalLabel: formatBaht(it.subtotal),
      })),
      itemCountLabel: `${b.items.length} รายการ`,
      quantitySummary: formatQuantityByUnit(b.items),
      totals: [
        { label: "รวมราคาสินค้า", value: formatBaht(itemsTotal) },
        {
          label: "ส่วนลด",
          value: toNumber(b.discount) ? `− ${formatBaht(b.discount)}` : "฿0",
        },
        {
          label: "ค่าจัดส่ง",
          value: toNumber(b.shippingFee) ? `+ ${formatBaht(b.shippingFee)}` : "฿0",
        },
      ],
      totalLabel: formatBaht(b.total),
      // Rounded to match formatBaht's whole-baht display elsewhere in the
      // app — otherwise the words could mention satang the number doesn't.
      totalWords: ThaiBahtText(Math.round(toNumber(b.total))),
      slipUrl: b.slipUrl,
    };
  });

  const slipUrls = receipts
    .map((r) => r.slipUrl)
    .filter((u): u is string => !!u);

  const documentTitles = [...new Set(receipts.map((r) => r.config.documentTitle))];
  const toolbarTitle =
    documentTitles.length === 1 ? documentTitles[0] : "เอกสารบิล";

  return (
    <div className="min-h-dvh bg-[#3d423e]">
      <style>{`@media print { @page { size: A4 portrait; margin: 0; } html, body { background: #fff !important; } }`}</style>
      <ReceiptPrintToolbar
        title={toolbarTitle}
        pagesLabel={`${receipts.length} ใบ · A4 แนวตั้ง`}
        slipUrls={slipUrls}
      />
      <div className="flex flex-col items-center gap-4 overflow-x-auto px-4 py-6 print:gap-0 print:p-0">
        {receipts.length === 0 ? (
          <div className="flex h-[297mm] w-[210mm] flex-none items-center justify-center bg-white text-[14px] text-[#6b746d] shadow-[0_8px_28px_rgba(0,0,0,0.35)]">
            ไม่พบบิลที่เลือก
          </div>
        ) : (
          receipts.map((rc) => (
            <div
              key={rc.id}
              className="box-border flex h-[297mm] w-[210mm] flex-none flex-col overflow-hidden break-after-page bg-white text-[#16211a] shadow-[0_8px_28px_rgba(0,0,0,0.35)] print:shadow-none"
            >
              {/* Top half */}
              <div className="box-border flex flex-1 flex-col border-b-2 border-dashed border-[rgba(22,33,26,0.45)] px-[44px] pt-[44px] pb-[24px]">
                <div className="flex items-start justify-between gap-6 border-b-2 border-[#16211a] pb-3.5">
                  <div>
                    <div className="font-num text-[9px] leading-none tracking-[.2em] text-accent uppercase">
                      มะพร้าวหอม
                    </div>
                    <div className="mt-[7px] text-[17px] leading-[1.3] font-bold">
                      {rc.storeName}
                    </div>
                    <div className="mt-[5px] text-[9.5px] leading-[1.55] text-[#4a544d]">
                      จำหน่ายมะพร้าวสด · ขูด หั่น คว้าน คั้นกะทิ
                      <br />
                      โทร 0X-XXX-XXXX · เลขประจำตัวผู้เสียภาษี X-XXXX-XXXXX-XX-X
                    </div>
                  </div>
                  <div className="flex-none text-right">
                    <div className="text-[20px] leading-[1.2] font-bold">
                      {rc.config.documentTitle}
                    </div>
                    <div className="font-num mt-[5px] text-[9px] leading-[1.3] tracking-[.12em] text-[#4a544d]">
                      {rc.config.documentTitleEn}
                    </div>
                    <div className="font-num mt-3 text-right text-[9.5px] leading-[1.7]">
                      <div>
                        เล่มที่ <b>{rc.bookNo}</b>
                      </div>
                      <div>
                        เลขที่ <b>{rc.receiptNo}</b>
                      </div>
                      <div>วันที่ {rc.dateLabel}</div>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-[1fr_200px] gap-5 border-b border-[rgba(22,33,26,0.25)] py-3.5">
                  <div>
                    <div className="font-num text-[8.5px] leading-none tracking-[.16em] text-[#6b746d] uppercase">
                      {rc.config.counterpartyHeading}
                    </div>
                    <div className="mt-[7px] text-[13px] leading-[1.35] font-bold">
                      {rc.customerName}
                    </div>
                    <div className="mt-1 text-[9.5px] leading-[1.5] text-[#4a544d]">
                      {rc.customerAddress}
                    </div>
                  </div>
                  <div>
                    <div className="font-num text-[8.5px] leading-none tracking-[.16em] text-[#6b746d] uppercase">
                      รหัส{rc.config.partyLabel} / รหัสบิล
                    </div>
                    <div className="font-num mt-[7px] text-[10.5px] leading-[1.6] font-semibold">
                      {rc.customerIdLabel}
                      <br />
                      {rc.billIdLabel}
                    </div>
                  </div>
                </div>

                <div className="mt-3.5 grid grid-cols-[30px_1fr_78px_92px_106px] bg-[#16211a] text-[9px] leading-[1.3] font-semibold text-white">
                  <div className="p-[7px_6px] text-center">#</div>
                  <div className="border-l border-white/28 p-[7px_8px]">
                    รายการ
                  </div>
                  <div className="border-l border-white/28 p-[7px_8px] text-right">
                    จำนวน
                  </div>
                  <div className="border-l border-white/28 p-[7px_8px] text-right">
                    ราคา/หน่วย
                  </div>
                  <div className="border-l border-white/28 p-[7px_8px] text-right">
                    จำนวนเงิน
                  </div>
                </div>
                {rc.items.map((it) => (
                  <div
                    key={it.id}
                    className="grid grid-cols-[30px_1fr_78px_92px_106px] border-b border-[rgba(22,33,26,0.2)]"
                  >
                    <div className="font-num border-l border-[rgba(22,33,26,0.2)] p-[7px_6px] text-center text-[9.5px] leading-[1.4]">
                      {it.no}
                    </div>
                    <div className="border-l border-[rgba(22,33,26,0.2)] p-[7px_8px] text-[10px] leading-[1.4] font-semibold">
                      {it.productName}
                    </div>
                    <div className="font-num border-l border-[rgba(22,33,26,0.2)] p-[7px_8px] text-right text-[9.5px] leading-[1.4]">
                      {it.quantityLabel}
                    </div>
                    <div className="font-num border-l border-[rgba(22,33,26,0.2)] p-[7px_8px] text-right text-[9.5px] leading-[1.4]">
                      {it.priceLabel}
                    </div>
                    <div className="font-num border-x border-[rgba(22,33,26,0.2)] p-[7px_8px] text-right text-[10px] leading-[1.4] font-semibold">
                      {it.subtotalLabel}
                    </div>
                  </div>
                ))}

                <div className="mt-auto grid grid-cols-[1fr_300px] gap-6 pt-4">
                  <div>
                    <div className="font-num text-[8.5px] leading-none tracking-[.16em] text-[#6b746d] uppercase">
                      จำนวนเงินตัวอักษร
                    </div>
                    <div className="mt-[7px] border-b border-[rgba(22,33,26,0.3)] pb-1.5 text-[11px] leading-[1.5] font-bold">
                      {rc.totalWords}
                    </div>
                    <div className="mt-2.5 text-[8.5px] leading-[1.6] text-[#6b746d]">
                      {rc.quantitySummary ? `${rc.quantitySummary} · ` : ""}
                      {rc.itemCountLabel}
                    </div>
                  </div>
                  <div>
                    {rc.totals.map((t) => (
                      <div
                        key={t.label}
                        className="flex justify-between gap-3.5 border-b border-[rgba(22,33,26,0.16)] py-[5px]"
                      >
                        <span className="text-[9.5px] leading-[1.35] text-[#4a544d]">
                          {t.label}
                        </span>
                        <span className="font-num text-[9.5px] leading-[1.35] font-semibold">
                          {t.value}
                        </span>
                      </div>
                    ))}
                    <div
                      className={`mt-[7px] flex items-baseline justify-between gap-3.5 px-2.5 py-[11px] text-white ${rc.config.color.bg}`}
                    >
                      <span className="text-[10.5px] leading-[1.3] font-bold">
                        ยอดสุทธิ
                      </span>
                      <span className="font-num text-[18px] leading-none font-bold">
                        {rc.totalLabel}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Bottom half */}
              <div className="box-border flex flex-1 flex-col px-[44px] pt-[22px] pb-[40px]">
                <div className="flex items-baseline justify-between gap-4">
                  <div className="font-num text-[9px] leading-none tracking-[.16em] text-[#6b746d] uppercase">
                    หลักฐานการชำระเงิน · สลิปโอนเงิน
                  </div>
                  <div className="font-num text-[9px] leading-[1.3] text-[#6b746d]">
                    {rc.receiptNo}
                  </div>
                </div>

                {rc.slipUrl ? (
                  <div className="mt-3 flex min-h-0 flex-1 items-center justify-center overflow-hidden border border-[rgba(22,33,26,0.3)] bg-[#f4f5f3]">
                    {/* Print/Save-as-PDF drop CSS background-images unless
                        "Background graphics" is checked, so the slip is a
                        real <img>. Its cap is an absolute length (not
                        max-h-full/100%) because Chromium's print engine
                        unreliably resolves percentage heights through
                        nested flex during pagination — when it fails, the
                        image falls back to its full intrinsic size (this
                        slip is ~340mm tall, bigger than the whole page),
                        blowing out the card and corrupting every bill's
                        page break after it. overflow-hidden here and on
                        the card above are a hard backstop either way. */}
                    <img
                      src={rc.slipUrl}
                      alt="สลิปโอนเงิน"
                      className="max-h-[100mm] max-w-full object-contain"
                    />
                  </div>
                ) : (
                  <div className="mt-3 flex flex-1 flex-col items-center justify-center border border-dashed border-[rgba(22,33,26,0.4)] text-center text-[11px] leading-[1.5] font-semibold text-[#8a938c]">
                    <div>ไม่มีสลิปโอนเงินแนบกับบิลนี้</div>
                    <div className="mt-1 text-[9.5px] leading-[1.6] font-normal">
                      (ชำระเงินสด / แนบเอกสารภายหลัง)
                    </div>
                  </div>
                )}

                <div className="mt-[22px] grid grid-cols-2 gap-[60px]">
                  <div className="text-center">
                    <div className="h-[34px] border-b border-[#16211a]" />
                    <div className="mt-[7px] text-[9px] leading-[1.4] text-[#4a544d]">
                      {rc.config.signatureLabels[0]}
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="h-[34px] border-b border-[#16211a]" />
                    <div className="mt-[7px] text-[9px] leading-[1.4] text-[#4a544d]">
                      {rc.config.signatureLabels[1]}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
