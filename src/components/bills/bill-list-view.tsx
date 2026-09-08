"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ListFilter,
  Search,
} from "lucide-react";
import { formatBaht, formatDateShort, formatKg } from "@/lib/format";
import type { BillListItem } from "@/lib/types";

const PAGE_SIZE = 8;

type FilterMode = "all" | "day" | "month" | "year";
type SearchBy = "customer_name" | "customer_address";

const FILTER_MODES: { key: FilterMode; label: string }[] = [
  { key: "all", label: "ทั้งหมด" },
  { key: "day", label: "รายวัน" },
  { key: "month", label: "รายเดือน" },
  { key: "year", label: "รายปี" },
];

function periodKeyOf(iso: string, mode: FilterMode): string {
  const d = new Date(iso);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  if (mode === "day") return `${y}-${m}-${day}`;
  if (mode === "month") return `${y}-${m}`;
  return String(y);
}

function periodLabelOf(key: string, mode: FilterMode): string {
  if (mode === "year") return "ปี " + (Number(key) + 543);
  const parts = key.split("-").map(Number);
  if (mode === "month") {
    return new Date(parts[0], parts[1] - 1, 1).toLocaleDateString("th-TH", {
      month: "long",
      year: "2-digit",
    });
  }
  return new Date(parts[0], parts[1] - 1, parts[2]).toLocaleDateString(
    "th-TH",
    { day: "numeric", month: "short" }
  );
}

export default function BillListView({ bills }: { bills: BillListItem[] }) {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [searchBy, setSearchBy] = useState<SearchBy>("customer_name");
  const [searchOpen, setSearchOpen] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);
  const [filterMode, setFilterMode] = useState<FilterMode>("all");
  const [filterPeriod, setFilterPeriod] = useState<string | null>(null);

  const periodsForMode = useMemo(() => {
    if (filterMode === "all") return [];
    const map = new Map<string, { count: number; total: number }>();
    for (const bill of bills) {
      const key = periodKeyOf(bill.createdAt, filterMode);
      const entry = map.get(key) ?? { count: 0, total: 0 };
      entry.count += 1;
      entry.total += bill.total;
      map.set(key, entry);
    }
    return [...map.entries()]
      .map(([key, value]) => ({ key, ...value }))
      .sort((a, b) => (a.key < b.key ? 1 : -1));
  }, [bills, filterMode]);

  const activePeriodKey = filterPeriod ?? periodsForMode[0]?.key ?? null;

  const filtered = useMemo(() => {
    let rows = bills;
    if (filterMode !== "all" && activePeriodKey) {
      rows = rows.filter(
        (b) => periodKeyOf(b.createdAt, filterMode) === activePeriodKey
      );
    }
    const q = search.trim().toLowerCase();
    if (q) {
      rows = rows.filter((b) =>
        (searchBy === "customer_name" ? b.customerName : b.customerAddress)
          .toLowerCase()
          .includes(q)
      );
    }
    return rows;
  }, [bills, filterMode, activePeriodKey, search, searchBy]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const slice = filtered.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE
  );
  const sumTotal = filtered.reduce((a, b) => a + b.total, 0);
  const sumKgAll = filtered.reduce((a, b) => a + b.totalKilogram, 0);

  const filterChipLabel =
    filterMode === "all"
      ? "ทุกช่วงเวลา"
      : activePeriodKey
        ? periodLabelOf(activePeriodKey, filterMode)
        : "ทุกช่วงเวลา";

  function openSearch() {
    setSearchOpen(true);
    setFilterOpen(false);
  }
  function toggleFilter() {
    setFilterOpen((v) => !v);
    setSearchOpen(false);
  }
  function resetFilter() {
    setFilterMode("all");
    setFilterPeriod(null);
    setPage(1);
  }
  function clearSearch() {
    setSearch("");
    setPage(1);
  }

  return (
    <div className="flex flex-1 flex-col pb-24">
      {/* Header */}
      <div className="border-b-2 border-divider px-5 pt-[26px] pb-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-[10px] leading-none font-semibold tracking-[.18em] text-accent uppercase">
              มะพร้าวหอม · Backoffice
            </div>
            <h1 className="mt-2.5 text-[32px] leading-[1.1] font-bold tracking-[-.01em]">
              บิลทั้งหมด
            </h1>
          </div>
          <div className="border-l-2 border-divider pl-3 text-right">
            <div className="font-num text-[22px] leading-none font-bold text-accent">
              {filtered.length.toLocaleString("en-US")}
            </div>
            <div className="mt-1 text-[10px] leading-[1.3] font-medium text-ink/55">
              รายการ
            </div>
          </div>
        </div>
      </div>

      {/* Summary bar */}
      <div className="grid grid-cols-3 border-b-2 border-divider bg-surface">
        <div className="border-r border-ink/14 p-[14px]">
          <div className="text-[9px] leading-none font-semibold tracking-[.13em] text-ink/50 uppercase">
            ยอดรวม
          </div>
          <div className="font-num mt-[7px] text-[17px] leading-[1.2] font-bold text-accent">
            {formatBaht(sumTotal)}
          </div>
        </div>
        <div className="border-r border-ink/14 p-[14px]">
          <div className="text-[9px] leading-none font-semibold tracking-[.13em] text-ink/50 uppercase">
            น้ำหนัก
          </div>
          <div className="font-num mt-[7px] text-[17px] leading-[1.2] font-bold">
            {formatKg(sumKgAll)}
          </div>
        </div>
        <div className="p-[14px]">
          <div className="text-[9px] leading-none font-semibold tracking-[.13em] text-ink/50 uppercase">
            เฉลี่ย/บิล
          </div>
          <div className="font-num mt-[7px] text-[17px] leading-[1.2] font-bold">
            {formatBaht(filtered.length ? sumTotal / filtered.length : 0)}
          </div>
        </div>
      </div>

      {/* Sticky search / filter bar */}
      <div className="sticky top-0 z-20 border-b-2 border-divider bg-surface">
        {!searchOpen && !filterOpen && (
          <div className="flex h-12 items-stretch">
            <button
              onClick={openSearch}
              className={`flex min-w-0 flex-1 items-center gap-[9px] border-0 border-r border-ink/14 bg-transparent px-4 text-left hover:bg-accent-100 ${
                search ? "text-accent" : "text-ink/60"
              }`}
            >
              <Search size={16} className="flex-none" />
              <span className="truncate text-[12.5px] font-semibold">
                {search ? `“${search}”` : "ค้นหาบิล"}
              </span>
            </button>
            <button
              onClick={toggleFilter}
              className={`flex min-w-0 flex-1 items-center gap-[9px] border-0 px-4 text-left hover:bg-accent-100 ${
                filterMode !== "all"
                  ? "bg-accent-100 text-accent"
                  : "text-ink/60"
              }`}
            >
              <ListFilter size={15} className="flex-none" />
              <span className="min-w-0 flex-1 truncate text-[12.5px] font-semibold">
                {filterChipLabel}
              </span>
              <ChevronDown
                size={13}
                strokeWidth={2.2}
                className="flex-none opacity-70"
              />
            </button>
          </div>
        )}

        {searchOpen && (
          <div>
            <div className="flex h-12 items-center gap-[10px] pr-3 pl-4">
              <Search size={16} className="flex-none text-ink/50" />
              <input
                autoFocus
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                placeholder={
                  searchBy === "customer_name"
                    ? "ค้นหาชื่อลูกค้า…"
                    : "ค้นหาที่อยู่…"
                }
                className="min-w-0 flex-1 border-0 bg-transparent text-[15px] outline-none"
              />
              <button
                onClick={() => setSearchOpen(false)}
                className="flex h-11 items-center px-1 text-[12px] font-semibold text-accent"
              >
                เสร็จ
              </button>
            </div>
            <div className="flex border-t border-ink/12">
              <button
                onClick={() => {
                  setSearchBy("customer_name");
                  setPage(1);
                }}
                className={`h-10 flex-1 border-0 px-4 text-left text-[11.5px] font-semibold ${
                  searchBy === "customer_name"
                    ? "bg-accent text-white"
                    : "text-ink/62"
                }`}
              >
                ชื่อลูกค้า
              </button>
              <button
                onClick={() => {
                  setSearchBy("customer_address");
                  setPage(1);
                }}
                className={`h-10 flex-1 border-0 border-l border-ink/12 px-4 text-left text-[11.5px] font-semibold ${
                  searchBy === "customer_address"
                    ? "bg-accent text-white"
                    : "text-ink/62"
                }`}
              >
                ที่อยู่
              </button>
            </div>
          </div>
        )}

        {filterOpen && (
          <div className="border-t border-ink/12">
            <div className="flex">
              {FILTER_MODES.map((m) => (
                <button
                  key={m.key}
                  onClick={() => {
                    setFilterMode(m.key);
                    setFilterPeriod(null);
                    setPage(1);
                  }}
                  className={`min-h-11 flex-1 border-0 border-r border-ink/12 px-[11px] text-left text-[12px] font-semibold ${
                    filterMode === m.key
                      ? "bg-accent text-white"
                      : "text-ink/62"
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>
            {filterMode !== "all" && (
              <div className="flex gap-2 overflow-x-auto border-t border-ink/12 px-4 py-3">
                {periodsForMode.map((p) => {
                  const on = p.key === activePeriodKey;
                  return (
                    <button
                      key={p.key}
                      onClick={() => {
                        setFilterPeriod(p.key);
                        setPage(1);
                      }}
                      className={`flex min-h-11 flex-none flex-col items-start justify-center gap-[3px] border px-[13px] whitespace-nowrap ${
                        on
                          ? "border-accent bg-accent text-white"
                          : "border-divider bg-transparent text-ink"
                      }`}
                    >
                      <span className="text-[12.5px] font-semibold">
                        {periodLabelOf(p.key, filterMode)}
                      </span>
                      <span className="font-num text-[9.5px] opacity-70">
                        {p.count} บิล · {formatBaht(p.total)}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
            <div className="flex items-center justify-between gap-3 border-t border-ink/12 px-4 py-[11px]">
              <button
                onClick={resetFilter}
                className={`flex-none border-0 bg-transparent p-0 text-[12px] font-semibold whitespace-nowrap ${
                  filterMode === "all" ? "text-ink/35" : "text-danger"
                }`}
              >
                ล้างตัวกรอง
              </button>
              <button
                onClick={() => setFilterOpen(false)}
                className="min-h-10 flex-none bg-accent px-4 text-[13px] font-semibold whitespace-nowrap text-white"
              >
                ใช้ตัวกรอง
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Rows */}
      {slice.length > 0 ? (
        <div className="flex flex-col">
          {slice.map((bill) => (
            <Link
              key={bill.id}
              href={`/bills/${bill.id}`}
              className="grid grid-cols-[1fr_auto] items-center gap-3.5 border-b border-divider-light bg-surface px-5 py-[15px] text-ink hover:bg-accent-100 active:bg-accent-200"
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-num bg-accent-100 px-[6px] py-1 text-[10px] font-semibold tracking-[.06em] text-accent">
                    #{bill.receiptNo}
                  </span>
                  <span className="text-[10px] font-medium text-ink/45">
                    {formatDateShort(bill.createdAt)}
                  </span>
                </div>
                <div className="mt-2 truncate text-[16px] font-semibold">
                  {bill.customerName}
                </div>
                <div className="mt-0.5 truncate text-[12px] text-ink/55">
                  {bill.customerAddress}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="text-right">
                  <div className="font-num text-[16px] leading-[1.1] font-bold">
                    {formatBaht(bill.total)}
                  </div>
                  <div className="font-num mt-[5px] text-[10px] leading-[1.1] text-ink/45">
                    {formatKg(bill.totalKilogram)} · {bill.itemCount} รายการ
                  </div>
                </div>
                <ChevronRight size={16} className="text-ink/35" />
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="border-b-2 border-divider bg-surface px-5 py-[60px]">
          <div className="text-[20px] font-bold">ไม่พบบิลที่ค้นหา</div>
          <p className="mt-2 mb-[18px] text-[13px] leading-[1.6] text-ink/55">
            ลองเปลี่ยนคำค้น หรือสลับไปค้นจากที่อยู่
          </p>
          <button
            onClick={clearSearch}
            className="min-h-11 border border-divider px-4 text-[13px] font-semibold"
          >
            ล้างการค้นหา
          </button>
        </div>
      )}

      {/* Pagination */}
      <div className="flex items-center justify-between gap-2.5 px-5 py-4">
        <div className="text-[11px] leading-[1.4] font-medium text-ink/55">
          หน้า {currentPage}/{totalPages} · แสดง {slice.length} จาก{" "}
          {filtered.length}
        </div>
        <div className="flex gap-2">
          <button
            disabled={currentPage <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            className="flex min-h-11 min-w-11 items-center justify-center border border-divider disabled:opacity-35"
          >
            <ChevronLeft size={16} />
          </button>
          <button
            disabled={currentPage >= totalPages}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            className="flex min-h-11 min-w-11 items-center justify-center border border-divider disabled:opacity-35"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
