"use client";

import { useState } from "react";
import { formatBaht, formatDateShort, formatKg } from "@/lib/format";
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

  const repTotal = inRange.reduce((a, b) => a + b.total, 0);
  const repKg = inRange.reduce((a, b) => a + b.totalKilogram, 0);
  const repAvg = inRange.length ? repTotal / inRange.length : 0;

  const bucketCount = range === "7d" ? 7 : range === "30d" ? 6 : 12;
  const bucketSpanDays = range === "7d" ? 1 : range === "30d" ? 5 : 30;
  const buckets = [];
  for (let i = bucketCount - 1; i >= 0; i--) {
    const end = now - i * bucketSpanDays * DAY_MS;
    const start = end - bucketSpanDays * DAY_MS;
    const value = inRange
      .filter((b) => {
        const t = new Date(b.createdAt).getTime();
        return t > start && t <= end;
      })
      .reduce((a, b) => a + b.total, 0);
    buckets.push({
      label: formatDateShort(new Date(end).toISOString()),
      short: value > 0 ? Math.round(value / 1000) + "k" : "",
      value,
    });
  }
  const maxBucket = Math.max(1, ...buckets.map((b) => b.value));

  const storeAgg = stores
    .map((store) => {
      const rows = inRange.filter((b) => b.storeId === store.id);
      return {
        name: store.name,
        value: rows.reduce((a, b) => a + b.total, 0),
        count: rows.length,
        kg: rows.reduce((a, b) => a + b.totalKilogram, 0),
      };
    })
    .sort((a, b) => b.value - a.value);
  const maxStore = Math.max(1, ...storeAgg.map((s) => s.value));

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

      {/* Total block */}
      <div className="border-b-2 border-divider bg-accent px-5 py-[22px] text-white">
        <div className="text-[10px] leading-none font-semibold tracking-[.18em] uppercase opacity-90">
          รายได้รวม · {RANGE_LABEL[range]}
        </div>
        <div className="font-num mt-3.5 text-[44px] leading-none font-bold tracking-[-.02em]">
          {formatBaht(repTotal)}
        </div>
        <div className="mt-[18px] flex gap-6 border-t border-white/40 pt-[15px]">
          <div>
            <div className="font-num text-[9.5px] leading-none font-semibold tracking-[.12em] uppercase opacity-90">
              บิล
            </div>
            <div className="font-num mt-[7px] text-[18px] leading-[1.1] font-bold">
              {inRange.length.toLocaleString("en-US")}
            </div>
          </div>
          <div>
            <div className="font-num text-[9.5px] leading-none font-semibold tracking-[.12em] uppercase opacity-90">
              น้ำหนัก
            </div>
            <div className="font-num mt-[7px] text-[18px] leading-[1.1] font-bold">
              {formatKg(repKg)}
            </div>
          </div>
          <div>
            <div className="font-num text-[9.5px] leading-none font-semibold tracking-[.12em] uppercase opacity-90">
              เฉลี่ย/บิล
            </div>
            <div className="font-num mt-[7px] text-[18px] leading-[1.1] font-bold">
              {formatBaht(repAvg)}
            </div>
          </div>
        </div>
      </div>

      {/* Chart */}
      <div className="border-b-2 border-divider bg-surface px-5 py-5">
        <div className="mb-5 flex items-baseline justify-between gap-3">
          <div className="text-[10px] font-semibold tracking-[.14em] text-ink/50 uppercase">
            รายได้ตามช่วงเวลา
          </div>
          <div className="font-num text-[11px] text-ink/50">
            สูงสุด {formatBaht(maxBucket)}
          </div>
        </div>
        <div className="flex h-[150px] items-end gap-1.5 border-b-2 border-divider">
          {buckets.map((b, i) => {
            const h = Math.max(3, Math.round((b.value / maxBucket) * 120));
            const fill =
              b.value === maxBucket
                ? "bg-accent"
                : b.value === 0
                  ? "bg-ink/10"
                  : "bg-accent-soft";
            return (
              <div
                key={i}
                className="flex h-full min-w-0 flex-1 flex-col justify-end"
              >
                <div className="font-num mb-1.5 text-center text-[9px] text-ink/50">
                  {b.short}
                </div>
                <div
                  className={`transition-[height] duration-[350ms] ease-in-out ${fill}`}
                  style={{ height: `${h}px` }}
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
                <span className="font-num text-[15px] font-bold">
                  {formatBaht(s.value)}
                </span>
              </div>
              <div className="mt-[9px] h-2.5 bg-ink/10">
                <div
                  className={`h-full transition-[width] duration-[400ms] ease-in-out ${
                    s.value === maxStore ? "bg-accent" : "bg-accent-soft"
                  }`}
                  style={{
                    width: `${Math.round((s.value / maxStore) * 100)}%`,
                  }}
                />
              </div>
              <div className="mt-1.5 flex justify-between text-[10.5px] text-ink/50">
                <span>
                  {s.count} บิล · {formatKg(s.kg)}
                </span>
                <span>
                  {repTotal ? Math.round((s.value / repTotal) * 100) : 0}%
                  ของยอดรวม
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
