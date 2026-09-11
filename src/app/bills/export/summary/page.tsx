import PrintToolbar from "@/components/export/print-toolbar";
import { getBill } from "@/lib/api/bills";
import { parseIds } from "@/lib/export/parse-ids";
import {
  formatBaht,
  formatDateFull,
  formatDateShort,
  formatKg,
  sumKg,
} from "@/lib/format";
import type { Bill } from "@/lib/types";

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
    const discountLabel = b.discount
      ? `ส่วนลด − ${formatBaht(b.discount)}`
      : "";
    const shippingLabel = b.shippingFee
      ? `ค่าส่ง + ${formatBaht(b.shippingFee)}`
      : "";
    return {
      id: b.id,
      dateLabel: formatDateShort(b.createdAt),
      customerName: b.customerName,
      customerAddress: b.customerAddress,
      items: b.items.map((it) => ({
        id: it.id,
        productName: it.productName,
        kgLabel: formatKg(it.quantity),
        subtotalLabel: formatBaht(it.subtotal),
      })),
      adjustLabel: [discountLabel, shippingLabel].filter(Boolean).join(" · "),
      totalLabel: formatBaht(b.total),
    };
  });

  const productMap = new Map<string, { kg: number; value: number }>();
  for (const b of bills) {
    for (const it of b.items) {
      const entry = productMap.get(it.productName) ?? { kg: 0, value: 0 };
      entry.kg += it.quantity;
      entry.value += it.subtotal;
      productMap.set(it.productName, entry);
    }
  }
  const productSummary = [...productMap.entries()]
    .map(([name, v]) => ({ name, ...v }))
    .sort((a, b) => b.value - a.value);

  const itemsTotal = bills.reduce(
    (a, b) => a + b.items.reduce((x, it) => x + it.subtotal, 0),
    0,
  );
  const discountSum = bills.reduce((a, b) => a + (b.discount || 0), 0);
  const shippingSum = bills.reduce((a, b) => a + (b.shippingFee || 0), 0);
  const grandTotal = itemsTotal - discountSum + shippingSum;
  const totalKg = bills.reduce((a, b) => a + sumKg(b), 0);

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
              <div className="mt-4 grid grid-cols-[66px_128px_1fr_250px_84px] bg-[#16211a] text-[9.5px] leading-[1.3] font-semibold text-white">
                <div className="p-2">วันที่</div>
                <div className="border-l border-white/28 p-2">ชื่อลูกค้า</div>
                <div className="border-l border-white/28 p-2">
                  ที่อยู่จัดส่ง
                </div>
                <div className="border-l border-white/28 p-2">
                  รายการสินค้า · กก. · ราคารวมรายการ
                </div>
                <div className="border-l border-white/28 p-2 text-right">
                  รวมบิล
                </div>
              </div>

              {/* Bill rows */}
              {rows.map((r) => (
                <div
                  key={r.id}
                  className="grid grid-cols-[66px_128px_1fr_250px_84px] border-b border-[rgba(22,33,26,0.22)] break-inside-avoid"
                >
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
                        className="grid grid-cols-[1fr_46px_62px] gap-1 border-b border-dotted border-[rgba(22,33,26,0.28)] px-2 py-[5px]"
                      >
                        <span className="text-[9px] leading-[1.35] font-medium">
                          {it.productName}
                        </span>
                        <span className="font-num text-right text-[9px] leading-[1.35] font-medium">
                          {it.kgLabel}
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
              ))}

              {/* Summary block */}
              <div className="mt-[26px] break-inside-avoid border-t-2 border-[#16211a] pt-3.5">
                <div className="font-num text-[9px] tracking-[.16em] text-[#4a544d] uppercase">
                  สรุปรวมทั้งเอกสาร · แยกตามสินค้า
                </div>
                <div className="mt-3 grid grid-cols-[1fr_90px_110px] border-b border-[rgba(22,33,26,0.3)] pb-1.5 text-[9px] font-semibold text-[#4a544d]">
                  <div>รายการสินค้า</div>
                  <div className="text-right">น้ำหนักรวม</div>
                  <div className="text-right">ราคารวม</div>
                </div>
                {productSummary.map((p) => (
                  <div
                    key={p.name}
                    className="grid grid-cols-[1fr_90px_110px] border-b border-[rgba(22,33,26,0.16)] py-[7px]"
                  >
                    <div className="text-[10px] leading-[1.35] font-semibold">
                      {p.name}
                    </div>
                    <div className="font-num text-right text-[10px] leading-[1.35] font-medium">
                      {formatKg(p.kg)}
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
                  <div className="font-num text-right text-[10.5px] leading-[1.35] font-bold">
                    {formatKg(totalKg)}
                  </div>
                  <div className="font-num text-right text-[10.5px] leading-[1.35] font-bold">
                    {formatBaht(itemsTotal)}
                  </div>
                </div>
                <div className="mt-3.5 flex justify-end">
                  <div className="w-[340px]">
                    <div className="flex justify-between gap-4 border-b border-[rgba(22,33,26,0.16)] py-1.5">
                      <span className="text-[10px] text-[#4a544d]">
                        รวมราคาสินค้า
                      </span>
                      <span className="font-num text-[10px] font-semibold">
                        {formatBaht(itemsTotal)}
                      </span>
                    </div>
                    <div className="flex justify-between gap-4 border-b border-[rgba(22,33,26,0.16)] py-1.5">
                      <span className="text-[10px] text-[#4a544d]">
                        ส่วนลดรวม
                      </span>
                      <span className="font-num text-[10px] font-semibold">
                        {discountSum ? `− ${formatBaht(discountSum)}` : "฿0"}
                      </span>
                    </div>
                    <div className="flex justify-between gap-4 border-b border-[rgba(22,33,26,0.16)] py-1.5">
                      <span className="text-[10px] text-[#4a544d]">
                        ค่าจัดส่งรวม
                      </span>
                      <span className="font-num text-[10px] font-semibold">
                        {shippingSum ? `+ ${formatBaht(shippingSum)}` : "฿0"}
                      </span>
                    </div>
                    <div className="mt-2 flex items-baseline justify-between gap-4 bg-accent px-2.5 py-3 text-white">
                      <span className="text-[11px] font-bold">
                        ยอดรวมสุทธิทั้งเอกสาร
                      </span>
                      <span className="font-num text-[19px] font-bold">
                        {formatBaht(grandTotal)}
                      </span>
                    </div>
                  </div>
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
