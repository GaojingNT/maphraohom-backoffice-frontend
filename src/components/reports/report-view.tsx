"use client";

import { useState } from "react";
import { formatBaht, formatDateShort } from "@/lib/format";
import { toNumber } from "@/lib/money";
import { BILL_TYPE_CONFIG } from "@/lib/bill-type";
import type { BillListItem, Store } from "@/lib/types";

type Range = "7d" | "30d" | "1y";

const RANGES: { key: Range; label: string }[] = [
  { key: "7d", label: "7 วัน" },
  { key: "30d", label: "30 วัน" },
  { key: "1y", label: "ทั้งปี" },
];

const RANGE_LABEL: Record<Range, string> = {
  "7d": "7 วันล่าสุด",
  "30d": "30 วันล่าสุด",
  "1y": "ปีนี้",
};

const DAY_MS = 86400000;

// Splits a set of bills into income (receipt) / expense (payment) totals —
// the two directions of money can never be summed together directly (spec:
// "ห้าม SUM total ข้าม type ตรง ๆ").
function incomeExpense(bills: BillListItem[]) {
  let income = 0;
  let expense = 0;
  for (const b of bills) {
    const amount = toNumber(b.total);
    if (b.type === "receipt") income += amount;
    else expense += amount;
  }
  return { income, expense, net: income - expense };
}

export default function ReportView({
  bills,
  stores,
}: {
  bills: BillListItem[];
  stores: Store[];
}) {
  const [range, setRange] = useState<Range>("7d");
  // Captured once per mount rather than read live during render, per
  // react-hooks/purity — the report doesn't need to tick in real time.
  const [now] = useState(() => Date.now());

  const days = range === "7d" ? 7 : range === "30d" ? 30 : 365;
  const since = now - days * DAY_MS;
  const inRange = bills.filter((b) => new Date(b.createdAt).getTime() >= since);

  const { income, expense, net } = incomeExpense(inRange);

  const bucketCount = range === "7d" ? 7 : range === "30d" ? 6 : 12;
  const bucketSpanDays = range === "7d" ? 1 : range === "30d" ? 5 : 30;
  const buckets = [];
  for (let i = bucketCount - 1; i >= 0; i--) {
    const end = now - i * bucketSpanDays * DAY_MS;
    const start = end - bucketSpanDays * DAY_MS;
    const inBucket = inRange.filter((b) => {
      const t = new Date(b.createdAt).getTime();
      return t > start && t <= end;
    });
    const { income: bucketIncome, expense: bucketExpense } = incomeExpense(inBucket);
    buckets.push({
      label: formatDateShort(new Date(end).toISOString()),
      income: bucketIncome,
      expense: bucketExpense,
    });
  }
  const maxBucket = Math.max(1, ...buckets.map((b) => Math.max(b.income, b.expense)));

  const storeAgg = stores
    .map((store) => {
      const rows = inRange.filter((b) => b.storeId === store.id);
      const agg = incomeExpense(rows);
      return { name: store.name, count: rows.length, ...agg };
    })
    .sort((a, b) => b.net - a.net);
  const maxStoreValue = Math.max(
    1,
    ...storeAgg.map((s) => Math.max(s.income, s.expense)),
  );

  return (
    <div className="flex flex-1 flex-col pb-24">
      {/* Header */}
      <div className="border-b-2 border-divider px-5 pt-[26px] pb-4">
        <div className="text-[10px] leading-none font-semibold tracking-[.18em] text-accent uppercase">
          สรุปรายได้
        </div>
        <h1 className="mt-2.5 text-[30px] leading-[1.15] font-bold tracking-[-.01em]">
          รายงาน
        </h1>
      </div>

      {/* Range picker */}
      <div className="flex border-b-2 border-divider bg-surface">
        {RANGES.map((r) => (
          <button
            key={r.key}
            type="button"
            onClick={() => setRange(r.key)}
            className={`min-h-12 flex-1 border-0 border-r border-ink/12 px-3.5 text-left text-[12.5px] font-semibold last:border-r-0 ${
              range === r.key ? "bg-accent text-white" : "text-ink/62"
            }`}
          >
            {r.label}
          </button>
        ))}
      </div>

      {/* Income / expense / net block */}
      <div className="border-b-2 border-divider bg-ink px-5 py-[22px] text-white">
        <div className="text-[10px] leading-none font-semibold tracking-[.18em] uppercase opacity-90">
          สรุป · {RANGE_LABEL[range]}
        </div>
        <div className="mt-4 grid grid-cols-3 gap-4">
          <div>
            <div className={`text-[9.5px] leading-none font-semibold tracking-[.12em] uppercase ${BILL_TYPE_CONFIG.receipt.color.text}`}>
              {BILL_TYPE_CONFIG.receipt.title}
            </div>
            <div className="font-num mt-[7px] text-[19px] leading-[1.1] font-bold">
              {formatBaht(income)}
            </div>
          </div>
          <div>
            <div className={`text-[9.5px] leading-none font-semibold tracking-[.12em] uppercase ${BILL_TYPE_CONFIG.payment.color.text}`}>
              {BILL_TYPE_CONFIG.payment.title}
            </div>
            <div className="font-num mt-[7px] text-[19px] leading-[1.1] font-bold">
              {formatBaht(expense)}
            </div>
          </div>
          <div>
            <div className="text-[9.5px] leading-none font-semibold tracking-[.12em] text-white/70 uppercase">
              สุทธิ
            </div>
            <div className="font-num mt-[7px] text-[19px] leading-[1.1] font-bold">
              {net < 0 ? "− " : ""}
              {formatBaht(Math.abs(net))}
            </div>
          </div>
        </div>
        <div className="mt-4 border-t border-white/25 pt-3 text-[11px] leading-[1.4] opacity-80">
          {inRange.length.toLocaleString("en-US")} บิล
        </div>
      </div>

      {/* Chart */}
      <div className="border-b-2 border-divider bg-surface px-5 py-5">
        <div className="mb-4 flex items-center justify-between gap-3 text-[10px] font-semibold tracking-[.14em] text-ink/50 uppercase">
          <span>รับ/จ่ายตามช่วงเวลา</span>
          <span className="flex items-center gap-3 normal-case">
            <span className="flex items-center gap-1">
              <span className="h-2 w-2 bg-accent" />รับเงิน
            </span>
            <span className="flex items-center gap-1">
              <span className="h-2 w-2 bg-payment" />จ่ายเงิน
            </span>
          </span>
        </div>
        <div className="flex h-[150px] items-end gap-1.5 border-b-2 border-divider">
          {buckets.map((b, i) => {
            const incomeH = Math.max(b.income > 0 ? 3 : 0, Math.round((b.income / maxBucket) * 120));
            const expenseH = Math.max(b.expense > 0 ? 3 : 0, Math.round((b.expense / maxBucket) * 120));
            return (
              <div key={i} className="flex h-full min-w-0 flex-1 items-end gap-[2px]">
                <div
                  className="min-w-0 flex-1 bg-accent transition-[height] duration-[350ms] ease-in-out"
                  style={{ height: `${incomeH}px` }}
                />
                <div
                  className="min-w-0 flex-1 bg-payment transition-[height] duration-[350ms] ease-in-out"
                  style={{ height: `${expenseH}px` }}
                />
              </div>
            );
          })}
        </div>
        <div className="mt-2 flex gap-1.5">
          {buckets.map((b, i) => (
            <div
              key={i}
              className="min-w-0 flex-1 overflow-hidden text-center text-[9.5px] text-ink/50"
            >
              {b.label}
            </div>
          ))}
        </div>
      </div>

      {/* By store */}
      <div className="px-5 py-5">
        <div className="mb-4 text-[10px] font-semibold tracking-[.14em] text-ink/50 uppercase">
          แยกตามสาขา
        </div>
        <div className="flex flex-col gap-[18px]">
          {storeAgg.map((s) => (
            <div key={s.name}>
              <div className="flex items-baseline justify-between gap-3">
                <span className="text-[14px] font-semibold">{s.name}</span>
                <span className="font-num text-[13px] text-ink/55">
                  {s.count} บิล
                </span>
              </div>
              <div className="mt-2 flex items-center gap-2">
                <span className="w-9 flex-none text-[9.5px] font-semibold text-accent">
                  รับ
                </span>
                <div className="h-2.5 flex-1 bg-ink/10">
                  <div
                    className="h-full bg-accent transition-[width] duration-[400ms] ease-in-out"
                    style={{ width: `${Math.round((s.income / maxStoreValue) * 100)}%` }}
                  />
                </div>
                <span className="font-num w-20 flex-none text-right text-[11px] font-semibold">
                  {formatBaht(s.income)}
                </span>
              </div>
              <div className="mt-1.5 flex items-center gap-2">
                <span className="w-9 flex-none text-[9.5px] font-semibold text-payment">
                  จ่าย
                </span>
                <div className="h-2.5 flex-1 bg-ink/10">
                  <div
                    className="h-full bg-payment transition-[width] duration-[400ms] ease-in-out"
                    style={{ width: `${Math.round((s.expense / maxStoreValue) * 100)}%` }}
                  />
                </div>
                <span className="font-num w-20 flex-none text-right text-[11px] font-semibold">
                  {formatBaht(s.expense)}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
