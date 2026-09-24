import PrintToolbar from "@/components/export/print-toolbar";
import { getBill } from "@/lib/api/bills";
import { parseIds } from "@/lib/export/parse-ids";
import { formatBaht, formatDateFull, formatDateShort, formatQuantity } from "@/lib/format";
import { toNumber } from "@/lib/money";
import { BILL_TYPE_CONFIG, type BillType } from "@/lib/bill-type";
import type { Bill } from "@/lib/types";

// Aggregates one bill-type's slice of the selection — goods value, discount,
// shipping, and grand total are only ever combined within the same type
// (spec: "ห้าม SUM total ข้าม type ตรง ๆ").
function aggregateByType(bills: Bill[], type: BillType) {
  const rows = bills.filter((b) => b.type === type);
  const itemsTotal = rows.reduce(
    (a, b) => a + b.items.reduce((x, it) => x + toNumber(it.subtotal), 0),
    0,
  );
  const discountSum = rows.reduce((a, b) => a + toNumber(b.discount), 0);
  const shippingSum = rows.reduce((a, b) => a + toNumber(b.shippingFee), 0);
  return {
    count: rows.length,
    itemsTotal,
    discountSum,
    shippingSum,
    grandTotal: itemsTotal - discountSum + shippingSum,
  };
}

export default async function ExportSummaryPage({
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

  const rows = bills.map((b) => {
    const discountLabel = toNumber(b.discount)
      ? `ส่วนลด − ${formatBaht(b.discount)}`
      : "";
    const shippingLabel = toNumber(b.shippingFee)
      ? `ค่าส่ง + ${formatBaht(b.shippingFee)}`
      : "";
    return {
      id: b.id,
      type: b.type,
      dateLabel: formatDateShort(b.createdAt),
      customerName: b.customerName,
      customerAddress: b.customerAddress,
      items: b.items.map((it) => ({
        id: it.id,
        productName: it.productName,
        quantityLabel: formatQuantity(it.quantity, it.unit),
        subtotalLabel: formatBaht(it.subtotal),
      })),
      adjustLabel: [discountLabel, shippingLabel].filter(Boolean).join(" · "),
      totalLabel: formatBaht(b.total),
    };
  });

  const productMap = new Map<string, { unit: string; qty: number; value: number }>();
  for (const b of bills) {
    for (const it of b.items) {
      const key = `${it.productName}|${it.unit}`;
      const entry = productMap.get(key) ?? { unit: it.unit, qty: 0, value: 0 };
      entry.qty += toNumber(it.quantity);
      entry.value += toNumber(it.subtotal);
      productMap.set(key, entry);
    }
  }
  const productSummary = [...productMap.entries()]
    .map(([key, v]) => ({ name: key.split("|")[0], ...v }))
    .sort((a, b) => b.value - a.value);

  const receiptAgg = aggregateByType(bills, "receipt");
  const paymentAgg = aggregateByType(bills, "payment");
  const hasMixedTypes = receiptAgg.count > 0 && paymentAgg.count > 0;
  const itemsTotalAll = receiptAgg.itemsTotal + paymentAgg.itemsTotal;

  const dates = bills.map((b) => new Date(b.createdAt).getTime());
  const dateSpan =
    bills.length > 0
      ? `${formatDateShort(new Date(Math.min(...dates)).toISOString())} – ${formatDateShort(new Date(Math.max(...dates)).toISOString())}`
      : "—";
  const issuedAt = formatDateFull(new Date().toISOString());

  return (
    <div className="min-h-dvh bg-[#3d423e]">
      <style>{`@media print { @page { size: A4 portrait; margin: 0; } html, body { background: #fff !important; } }`}</style>
      <PrintToolbar
        title="เอกสารสรุปสินค้า"
        pagesLabel={`${bills.length} บิล · A4 แนวตั้ง`}
      />
      <div className="flex justify-center overflow-x-auto px-4 py-6 print:p-0">
        <div className="box-border flex min-h-[297mm] w-[210mm] flex-none flex-col bg-white px-[46px] pt-[46px] pb-[40px] text-[#16211a] shadow-[0_8px_28px_rgba(0,0,0,0.35)] print:shadow-none">
          {bills.length === 0 ? (
            <div className="m-auto text-[14px] text-[#6b746d]">
              ไม่พบบิลที่เลือก
            </div>
          ) : (
            <>
              {/* Document header */}
              <div className="flex items-start justify-between gap-5 border-b-2 border-[#16211a] pb-3.5">
                <div>
                  <div className="font-num text-[9px] leading-none tracking-[.2em] text-accent uppercase">
                    มะพร้าวหอม
                  </div>
                  <div className="mt-2 text-[22px] leading-[1.25] font-bold">
                    เอกสารสรุปสินค้า
                  </div>
                </div>
                <div className="font-num text-right text-[10px] leading-[1.7] text-[#4a544d]">
                  <div>วันที่ออกเอกสาร {issuedAt}</div>
                  <div>
                    จำนวนบิล {bills.length} บิล · ช่วงข้อมูล {dateSpan}
                  </div>
                </div>
              </div>

              {/* Table header */}
              <div className="mt-4 grid grid-cols-[46px_66px_128px_1fr_250px_84px] bg-[#16211a] text-[9.5px] leading-[1.3] font-semibold text-white">
                <div className="p-2">ประเภท</div>
                <div className="border-l border-white/28 p-2">วันที่</div>
                <div className="border-l border-white/28 p-2">ชื่อลูกค้า</div>
                <div className="border-l border-white/28 p-2">
                  ที่อยู่จัดส่ง
                </div>
                <div className="border-l border-white/28 p-2">
                  รายการสินค้า · จำนวน · ราคารวมรายการ
                </div>
                <div className="border-l border-white/28 p-2 text-right">
                  รวมบิล
                </div>
              </div>

              {/* Bill rows */}
              {rows.map((r) => {
                const config = BILL_TYPE_CONFIG[r.type];
                return (
                  <div
                    key={r.id}
                    className="grid grid-cols-[46px_66px_128px_1fr_250px_84px] border-b border-[rgba(22,33,26,0.22)] break-inside-avoid"
                  >
                    <div className="border-l border-[rgba(22,33,26,0.22)] p-2 text-[8.5px] leading-[1.4] font-semibold">
                      {config.title.replace("บิล", "")}
                    </div>
                    <div className="font-num border-l border-[rgba(22,33,26,0.22)] p-2 text-[9.5px] leading-[1.4]">
                      {r.dateLabel}
                    </div>
                    <div className="border-l border-[rgba(22,33,26,0.22)] p-2 text-[9.5px] leading-[1.4] font-semibold">
                      {r.customerName}
                    </div>
                    <div className="border-l border-[rgba(22,33,26,0.22)] p-2 text-[9px] leading-[1.45] text-[#4a544d]">
                      {r.customerAddress}
                    </div>
                    <div className="border-x border-[rgba(22,33,26,0.22)]">
                      {r.items.map((it) => (
                        <div
                          key={it.id}
                          className="grid grid-cols-[1fr_60px_62px] gap-1 border-b border-dotted border-[rgba(22,33,26,0.28)] px-2 py-[5px]"
                        >
                          <span className="text-[9px] leading-[1.35] font-medium">
                            {it.productName}
                          </span>
                          <span className="font-num text-right text-[9px] leading-[1.35] font-medium">
                            {it.quantityLabel}
                          </span>
                          <span className="font-num text-right text-[9px] leading-[1.35] font-semibold">
                            {it.subtotalLabel}
                          </span>
                        </div>
                      ))}
                      {r.adjustLabel && (
                        <div className="font-num px-2 py-1 text-[8.5px] leading-[1.4] text-[#4a544d]">
                          {r.adjustLabel}
                        </div>
                      )}
                    </div>
                    <div className="font-num border-r border-[rgba(22,33,26,0.22)] p-2 text-right text-[10.5px] leading-[1.4] font-bold">
                      {r.totalLabel}
                    </div>
                  </div>
                );
              })}

              {/* Summary block */}
              <div className="mt-[26px] break-inside-avoid border-t-2 border-[#16211a] pt-3.5">
                <div className="font-num text-[9px] tracking-[.16em] text-[#4a544d] uppercase">
                  สรุปรวมทั้งเอกสาร · แยกตามสินค้า
                </div>
                <div className="mt-3 grid grid-cols-[1fr_90px_110px] border-b border-[rgba(22,33,26,0.3)] pb-1.5 text-[9px] font-semibold text-[#4a544d]">
                  <div>รายการสินค้า</div>
                  <div className="text-right">จำนวนรวม</div>
                  <div className="text-right">ราคารวม</div>
                </div>
                {productSummary.map((p) => (
                  <div
                    key={p.name + p.unit}
                    className="grid grid-cols-[1fr_90px_110px] border-b border-[rgba(22,33,26,0.16)] py-[7px]"
                  >
                    <div className="text-[10px] leading-[1.35] font-semibold">
                      {p.name}
                    </div>
                    <div className="font-num text-right text-[10px] leading-[1.35] font-medium">
                      {formatQuantity(p.qty, p.unit)}
                    </div>
                    <div className="font-num text-right text-[10px] leading-[1.35] font-semibold">
                      {formatBaht(p.value)}
                    </div>
                  </div>
                ))}
                <div className="grid grid-cols-[1fr_90px_110px] border-b-2 border-[#16211a] bg-[#f2f5f3] py-[9px]">
                  <div className="pl-1.5 text-[10.5px] leading-[1.35] font-bold">
                    รวมสินค้าทั้งหมด
                  </div>
                  <div />
                  <div className="font-num text-right text-[10.5px] leading-[1.35] font-bold">
                    {formatBaht(itemsTotalAll)}
                  </div>
                </div>

                {/* Grand totals — kept per bill type, never summed together
                    directly across receipt/payment. */}
                <div className="mt-3.5 flex flex-col items-end gap-3">
                  {receiptAgg.count > 0 && (
                    <div className="w-[340px]">
                      <div className="text-[9.5px] font-bold text-accent uppercase">
                        {BILL_TYPE_CONFIG.receipt.title} · {receiptAgg.count} บิล
                      </div>
                      <TotalsBlock agg={receiptAgg} colorClass="bg-accent" />
                    </div>
                  )}
                  {paymentAgg.count > 0 && (
                    <div className="w-[340px]">
                      <div className="text-[9.5px] font-bold text-payment uppercase">
                        {BILL_TYPE_CONFIG.payment.title} · {paymentAgg.count} บิล
                      </div>
                      <TotalsBlock agg={paymentAgg} colorClass="bg-payment" />
                    </div>
                  )}
                  {hasMixedTypes && (
                    <div className="flex w-[340px] items-baseline justify-between gap-4 bg-ink px-2.5 py-3 text-white">
                      <span className="text-[11px] font-bold">
                        สุทธิ (รับ − จ่าย)
                      </span>
                      <span className="font-num text-[19px] font-bold">
                        {formatBaht(receiptAgg.grandTotal - paymentAgg.grandTotal)}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Footer */}
              <div className="font-num mt-auto flex justify-between gap-5 border-t border-[rgba(22,33,26,0.2)] pt-[26px] text-[8.5px] leading-[1.5] text-[#6b746d]">
                <span>มะพร้าวหอม — เอกสารสรุปสินค้า</span>
                <span>ออกโดยระบบ Backoffice · {issuedAt}</span>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function TotalsBlock({
  agg,
  colorClass,
}: {
  agg: { itemsTotal: number; discountSum: number; shippingSum: number; grandTotal: number };
  colorClass: string;
}) {
  return (
    <div className="mt-1.5">
      <div className="flex justify-between gap-4 border-b border-[rgba(22,33,26,0.16)] py-1.5">
        <span className="text-[10px] text-[#4a544d]">รวมราคาสินค้า</span>
        <span className="font-num text-[10px] font-semibold">
          {formatBaht(agg.itemsTotal)}
        </span>
      </div>
      <div className="flex justify-between gap-4 border-b border-[rgba(22,33,26,0.16)] py-1.5">
        <span className="text-[10px] text-[#4a544d]">ส่วนลดรวม</span>
        <span className="font-num text-[10px] font-semibold">
          {agg.discountSum ? `− ${formatBaht(agg.discountSum)}` : "฿0"}
        </span>
      </div>
      <div className="flex justify-between gap-4 border-b border-[rgba(22,33,26,0.16)] py-1.5">
        <span className="text-[10px] text-[#4a544d]">ค่าจัดส่งรวม</span>
        <span className="font-num text-[10px] font-semibold">
          {agg.shippingSum ? `+ ${formatBaht(agg.shippingSum)}` : "฿0"}
        </span>
      </div>
      <div className={`mt-2 flex items-baseline justify-between gap-4 px-2.5 py-3 text-white ${colorClass}`}>
        <span className="text-[11px] font-bold">ยอดรวมสุทธิ</span>
        <span className="font-num text-[19px] font-bold">
          {formatBaht(agg.grandTotal)}
        </span>
      </div>
    </div>
  );
}
