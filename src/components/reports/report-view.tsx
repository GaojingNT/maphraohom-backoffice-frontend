"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowDown, ArrowUp, ChevronRight } from "lucide-react";
import { formatBaht, formatDateShort } from "@/lib/format";
import { toNumber } from "@/lib/money";
import type { BillListItem, Store } from "@/lib/types";

type Range = "7d" | "30d" | "1y";

const RANGES: { key: Range; label: string }[] = [
  { key: "7d", label: "7 วัน" },
  { key: "30d", label: "30 วัน" },
  { key: "1y", label: "12 เดือน" },
];

const RANGE_LABEL: Record<Range, string> = {
  "7d": "7 วันล่าสุด",
  "30d": "30 วันล่าสุด",
  "1y": "12 เดือนล่าสุด",
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

function signedBaht(n: number) {
  return (n < 0 ? "−" : "") + formatBaht(Math.abs(n));
}

function compactBaht(n: number) {
  if (n >= 1000000) return `฿${+(n / 1000000).toFixed(1)}M`;
  if (n >= 1000) return `฿${+(n / 1000).toFixed(1)}k`;
  return `฿${Math.round(n)}`;
}

interface Bucket {
  label: string;
  longLabel: string;
  start: number;
  end: number;
  /** Bill-list filter this bar opens, when it maps onto one exactly. */
  href: string | null;
}

function pad(n: number) {
  return String(n).padStart(2, "0");
}

function buildBuckets(range: Range, now: number): Bucket[] {
  const today = new Date(now);
  const startOfToday = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate(),
  ).getTime();
  const out: Bucket[] = [];
  if (range === "7d") {
    for (let i = 6; i >= 0; i--) {
      const start = startOfToday - i * DAY_MS;
      const d = new Date(start);
      out.push({
        label: String(d.getDate()),
        longLabel: formatDateShort(d.toISOString()),
        start,
        end: start + DAY_MS,
        href: `/?mode=day&period=${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`,
      });
    }
  } else if (range === "30d") {
    for (let i = 5; i >= 0; i--) {
      const end = startOfToday + DAY_MS - i * 5 * DAY_MS;
      const start = end - 5 * DAY_MS;
      out.push({
        label: formatDateShort(new Date(start).toISOString()),
        longLabel: `${formatDateShort(new Date(start).toISOString())} – ${formatDateShort(new Date(end - DAY_MS).toISOString())}`,
        start,
        end,
        href: null,
      });
    }
  } else {
    // Calendar months, oldest first, ending with the current month.
    for (let i = 11; i >= 0; i--) {
      const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
      const next = new Date(today.getFullYear(), today.getMonth() - i + 1, 1);
      out.push({
        label: d.toLocaleDateString("th-TH", { month: "short" }),
        longLabel: d.toLocaleDateString("th-TH", {
          month: "long",
          year: "2-digit",
        }),
        start: d.getTime(),
        end: next.getTime(),
        href: `/?mode=month&period=${d.getFullYear()}-${pad(d.getMonth() + 1)}`,
      });
    }
  }
  return out;
}

export default function ReportView({
  bills,
  stores,
}: {
  bills: BillListItem[];
  stores: Store[];
}) {
  const [range, setRange] = useState<Range>("7d");
  const [activeBar, setActiveBar] = useState<number | null>(null);
  // Captured once per mount rather than read live during render, per
  // react-hooks/purity — the report doesn't need to tick in real time.
  const [now] = useState(() => Date.now());

  const buckets = buildBuckets(range, now).map((b) => {
    const rows = bills.filter((bill) => {
      const t = new Date(bill.createdAt).getTime();
      return t >= b.start && t < b.end;
    });
    return { ...b, ...incomeExpense(rows) };
  });
  const rangeStart = buckets[0].start;
  const rangeEnd = buckets[buckets.length - 1].end;
  const inRange = bills.filter((b) => {
    const t = new Date(b.createdAt).getTime();
    return t >= rangeStart && t < rangeEnd;
  });
  const { income, expense, net } = incomeExpense(inRange);

  const maxBucket = Math.max(
    1,
    ...buckets.map((b) => Math.max(b.income, b.expense)),
  );
  const tip = activeBar != null ? buckets[activeBar] : null;

  const storeAgg = stores
    .map((store) => {
      const rows = inRange.filter((b) => b.storeId === store.id);
      return {
        id: store.id,
        name: store.name,
        count: rows.length,
        ...incomeExpense(rows),
      };
    })
    .sort((a, b) => b.net - a.net);
  const maxStoreValue = Math.max(
    1,
    ...storeAgg.map((s) => Math.max(s.income, s.expense)),
  );

  return (
    <div className="flex flex-1 flex-col pb-24">
      <div className="mk-header">
        <div>
          <div className="mk-eyebrow">สรุปรายได้</div>
          <h1 className="mk-h1">รายงาน</h1>
        </div>
      </div>

      <div className="flex flex-col gap-4 px-4 pb-6">
        <div className="mk-seg" role="group" aria-label="ช่วงเวลา">
          {RANGES.map((r) => (
            <button
              key={r.key}
              type="button"
              className="is-sand"
              aria-pressed={range === r.key}
              onClick={() => {
                setRange(r.key);
                setActiveBar(null);
              }}
            >
              {r.label}
            </button>
          ))}
        </div>

        {/* Summary */}
        <div className="mk-card mk-card__pad">
          <div className="flex items-baseline justify-between">
            <span className="mk-caption text-[13px]! font-semibold">
              สรุป · {RANGE_LABEL[range]}
            </span>
            <span className="mk-caption">
              {inRange.length.toLocaleString("en-US")} บิล
            </span>
          </div>
          <div className="mt-1.5">
            <div className="mk-caption">สุทธิ</div>
            <div className="num text-[32px] leading-[38px] font-bold">
              {signedBaht(net)}
            </div>
          </div>
          <div className="mk-grid2 mt-3">
            <div className="rounded-md bg-receipt-100 px-3 py-2.5">
              <div className="mk-caption flex items-center gap-1 font-semibold text-receipt-600!">
                <ArrowDown size={14} strokeWidth={2.4} /> บิลรับเงิน
              </div>
              <div className="num text-[18px] font-bold text-receipt-600">
                {formatBaht(income)}
              </div>
            </div>
            <div className="rounded-md bg-payment-100 px-3 py-2.5">
              <div className="mk-caption flex items-center gap-1 font-semibold text-payment-700!">
                <ArrowUp size={14} strokeWidth={2.4} /> บิลจ่ายเงิน
              </div>
              <div className="num text-[18px] font-bold text-payment-700">
                {formatBaht(expense)}
              </div>
            </div>
          </div>
        </div>

        {/* Chart */}
        <div className="mk-card mk-card__pad">
          <div className="flex items-center justify-between gap-2">
            <h2 className="mk-title">รับ/จ่ายตามช่วงเวลา</h2>
            <div className="mk-legend">
              <span>
                <i className="bg-receipt-600" />
                รับเงิน
              </span>
              <span>
                <i className="bg-payment-600" />
                จ่ายเงิน
              </span>
            </div>
          </div>
          <div className="relative mt-3">
            {tip && (
              <div className="mk-tooltip">
                <b>{tip.longLabel}</b>
                <div className="flex justify-between">
                  <span>รับ</span>
                  <span className="num font-semibold">
                    {formatBaht(tip.income)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>จ่าย</span>
                  <span className="num font-semibold">
                    {formatBaht(tip.expense)}
                  </span>
                </div>
                {tip.href && (
                  <Link
                    href={tip.href}
                    className="mk-btn mk-btn--sm mt-1.5 w-full bg-white/15! text-white!"
                  >
                    ดูบิลช่วงนี้
                    <ChevronRight />
                  </Link>
                )}
              </div>
            )}
            <div className="flex gap-1.5">
              <div className="num flex h-[150px] min-w-[34px] flex-col justify-between pb-[22px] text-right text-[10px] text-ink-muted">
                <span>{compactBaht(maxBucket)}</span>
                <span>{compactBaht(maxBucket / 2)}</span>
                <span>0</span>
              </div>
              <div className="mk-bars min-w-0 flex-1">
                {buckets.map((b, i) => (
                  <button
                    key={b.start}
                    type="button"
                    aria-label={`${b.longLabel} รับ ${formatBaht(b.income)} จ่าย ${formatBaht(b.expense)}`}
                    aria-pressed={activeBar === i}
                    className={`mk-bars__g ${activeBar === i ? "is-hl" : ""}`}
                    onClick={() => setActiveBar(activeBar === i ? null : i)}
                  >
                    <span className="mk-bars__pair">
                      <i
                        className="mk-bars__b in transition-[height] duration-300"
                        style={{
                          height: `${Math.round((b.income / maxBucket) * 100)}%`,
                        }}
                      />
                      <i
                        className="mk-bars__b out transition-[height] duration-300"
                        style={{
                          height: `${Math.round((b.expense / maxBucket) * 100)}%`,
                        }}
                      />
                    </span>
                    <span className="mk-bars__l">{b.label}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
          <div className="mk-caption mt-2">
            แตะแท่งเพื่อดูยอดและรายการบิลของช่วงนั้น
          </div>
        </div>

        {/* By store */}
        <div className="mk-card mk-card__pad">
          <h2 className="mk-title mb-3">แยกตามร้าน</h2>
          <div className="mk-storebreak">
            {storeAgg.map((s) => (
              <Link key={s.id} href={`/?store=${s.id}`} className="block">
                <div className="flex items-baseline justify-between gap-2">
                  <b className="truncate text-[15px]">{s.name}</b>
                  <span className="mk-caption flex-none">
                    {s.count} บิล · สุทธิ{" "}
                    <span className="num font-semibold text-ink">
                      {signedBaht(s.net)}
                    </span>
                  </span>
                </div>
                <div className="mk-meterrow">
                  <span>รับ</span>
                  <div className="mk-meter">
                    <i
                      className="bg-receipt-600 transition-[width] duration-300"
                      style={{
                        width: `${Math.round((s.income / maxStoreValue) * 100)}%`,
                      }}
                    />
                  </div>
                  <span className="num text-receipt-600">
                    {formatBaht(s.income)}
                  </span>
                </div>
                <div className="mk-meterrow">
                  <span>จ่าย</span>
                  <div className="mk-meter">
                    <i
                      className="bg-payment-600 transition-[width] duration-300"
                      style={{
                        width: `${Math.round((s.expense / maxStoreValue) * 100)}%`,
                      }}
                    />
                  </div>
                  <span className="num text-payment-700">
                    {formatBaht(s.expense)}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
