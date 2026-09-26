"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowDown,
  ArrowUp,
  CalendarDays,
  Check,
  ChevronLeft,
  ChevronRight,
  Download,
  FileText,
  Inbox,
  List,
  Paperclip,
  Plus,
  Search,
  SearchX,
  SquareCheck,
  X,
} from "lucide-react";
import { formatBaht } from "@/lib/format";
import { toNumber } from "@/lib/money";
import { BILL_TYPE_CONFIG, type BillType } from "@/lib/bill-type";
import type { BillListItem } from "@/lib/types";
import { Sheet } from "@/components/ui/overlay";
import BillTypeSheet from "@/components/bills/bill-type-sheet";

const PAGE_SIZE = 8;

type TypeTab = "all" | BillType;
export type FilterMode = "all" | "day" | "month" | "year";
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
    { day: "numeric", month: "short" },
  );
}

// Day-group header: "วันนี้ · 26 ก.ย." / "เมื่อวาน · 25 ก.ย." / "24 ก.ย. 69".
function dayLabelOf(iso: string, now: number): string {
  const d = new Date(iso);
  const today = new Date(now);
  const startOf = (x: Date) =>
    new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const diffDays = Math.round((startOf(today) - startOf(d)) / 86400000);
  const short = d.toLocaleDateString("th-TH", {
    day: "numeric",
    month: "short",
  });
  if (diffDays === 0) return `วันนี้ · ${short}`;
  if (diffDays === 1) return `เมื่อวาน · ${short}`;
  return d.toLocaleDateString("th-TH", {
    day: "numeric",
    month: "short",
    year: "2-digit",
  });
}

function timeOf(iso: string): string {
  return new Date(iso).toLocaleTimeString("th-TH", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

// Money in minus money out — receipt and payment totals are never simply
// added together (spec §7 #6).
function netOf(bills: BillListItem[]) {
  let income = 0;
  let expense = 0;
  for (const b of bills) {
    if (b.type === "receipt") income += toNumber(b.total);
    else expense += toNumber(b.total);
  }
  return { income, expense, net: income - expense };
}

function signedBaht(n: number) {
  return (n < 0 ? "−" : "") + formatBaht(Math.abs(n));
}

export interface BillListFilter {
  mode: FilterMode;
  period: string | null;
  storeId: number | null;
}

export default function BillListView({
  bills,
  initialFilter,
}: {
  bills: BillListItem[];
  initialFilter?: BillListFilter;
}) {
  const router = useRouter();
  const [now] = useState(() => Date.now());
  const [page, setPage] = useState(1);
  const [typeTab, setTypeTab] = useState<TypeTab>("all");
  const [storeId, setStoreId] = useState<number | null>(
    initialFilter?.storeId ?? null,
  );
  const [search, setSearch] = useState("");
  const [searchBy, setSearchBy] = useState<SearchBy>("customer_name");
  const [searchOpen, setSearchOpen] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);
  const [filterMode, setFilterMode] = useState<FilterMode>(
    initialFilter?.mode ?? "all",
  );
  const [filterPeriod, setFilterPeriod] = useState<string | null>(
    initialFilter?.period ?? null,
  );
  const [typeSheetOpen, setTypeSheetOpen] = useState(false);

  // Selection mode (ADDENDUM-export.md §1) — `selected` is keyed by bill id
  // and deliberately untouched by page/search/filter changes, so a
  // selection made under one filter survives switching to another.
  const [selectMode, setSelectMode] = useState(false);
  const [selected, setSelected] = useState<Record<number, true>>({});
  const [exportSheetOpen, setExportSheetOpen] = useState(false);

  // Stores that appear in the list — the filter chips only show when there
  // is more than one to choose from.
  const stores = useMemo(() => {
    const map = new Map<number, string>();
    for (const b of bills) map.set(b.storeId, b.storeName);
    return [...map.entries()].map(([id, name]) => ({ id, name }));
  }, [bills]);

  const base = useMemo(
    () =>
      bills.filter(
        (b) =>
          (typeTab === "all" || b.type === typeTab) &&
          (storeId == null || b.storeId === storeId),
      ),
    [bills, typeTab, storeId],
  );

  const periodsForMode = useMemo(() => {
    if (filterMode === "all") return [];
    const map = new Map<string, BillListItem[]>();
    for (const bill of base) {
      const key = periodKeyOf(bill.createdAt, filterMode);
      map.set(key, [...(map.get(key) ?? []), bill]);
    }
    return [...map.entries()]
      .map(([key, rows]) => ({
        key,
        count: rows.length,
        total:
          typeTab === "all"
            ? netOf(rows).net
            : rows.reduce((a, b) => a + toNumber(b.total), 0),
      }))
      .sort((a, b) => (a.key < b.key ? 1 : -1));
  }, [base, filterMode, typeTab]);

  const activePeriodKey = filterPeriod ?? periodsForMode[0]?.key ?? null;
  const periodActive = filterMode !== "all" && !!activePeriodKey;

  const filtered = useMemo(() => {
    let rows = base;
    if (filterMode !== "all" && activePeriodKey) {
      rows = rows.filter(
        (b) => periodKeyOf(b.createdAt, filterMode) === activePeriodKey,
      );
    }
    const q = search.trim().toLowerCase();
    if (q) {
      rows = rows.filter((b) =>
        (searchBy === "customer_name" ? b.customerName : b.customerAddress)
          .toLowerCase()
          .includes(q),
      );
    }
    return rows;
  }, [base, filterMode, activePeriodKey, search, searchBy]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const slice = filtered.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE,
  );

  const { income, expense, net } = netOf(filtered);
  const sumTotal = filtered.reduce((a, b) => a + toNumber(b.total), 0);
  const missingSlipCount = filtered.filter((b) => !b.hasSlip).length;

  // Rows of this page grouped under a header per day (spec §7 #7).
  const groups = useMemo(() => {
    const out: { key: string; label: string; rows: BillListItem[] }[] = [];
    for (const bill of slice) {
      const key = periodKeyOf(bill.createdAt, "day");
      const last = out[out.length - 1];
      if (last && last.key === key) last.rows.push(bill);
      else
        out.push({ key, label: dayLabelOf(bill.createdAt, now), rows: [bill] });
    }
    return out;
  }, [slice, now]);

  const selectedBills = bills.filter((b) => selected[b.id]);
  const selectedCount = selectedBills.length;
  const selectedTotal = selectedBills.reduce(
    (a, b) => a + toNumber(b.total),
    0,
  );
  const selectedReceipts = selectedBills.filter(
    (b) => b.type === "receipt",
  ).length;

  function resetPage() {
    setPage(1);
  }

  function clearEverything() {
    setSearch("");
    setSearchOpen(false);
    setFilterMode("all");
    setFilterPeriod(null);
    setStoreId(null);
    setTypeTab("all");
    setPage(1);
  }

  function toggleSelectMode() {
    setSelectMode((v) => !v);
    setSelected({});
    setExportSheetOpen(false);
  }

  function selectAllOrClear() {
    if (selectedCount > 0) {
      // "ล้างที่เลือก" clears the whole selection, not just this page —
      // see ADDENDUM-export.md §1.
      setSelected({});
      return;
    }
    setSelected((prev) => {
      const next = { ...prev };
      slice.forEach((b) => {
        next[b.id] = true;
      });
      return next;
    });
  }

  function toggleSelected(id: number) {
    setSelected((prev) => {
      const next = { ...prev };
      if (next[id]) delete next[id];
      else next[id] = true;
      return next;
    });
  }

  function exportTo(kind: "summary" | "receipt") {
    // Documents list bills oldest → newest (spec S6).
    const ids = [...selectedBills]
      .sort((a, b) => (a.createdAt < b.createdAt ? -1 : 1))
      .map((b) => b.id)
      .join(",");
    setExportSheetOpen(false);
    router.push(`/bills/export/${kind}?ids=${ids}`);
  }

  const periodLabel = periodActive
    ? periodLabelOf(activePeriodKey!, filterMode)
    : "ทุกช่วงเวลา";

  return (
    <div className="flex flex-1 flex-col pb-24">
      {/* Header */}
      <div className="mk-header">
        <div>
          <div className="mk-eyebrow">มะพร้าวหอม · Backoffice</div>
          <h1 className="mk-h1">บิลทั้งหมด</h1>
        </div>
        <div className="flex items-center gap-2">
          <div className="mk-counter">
            <b>{filtered.length.toLocaleString("en-US")}</b>
            <small>รายการ</small>
          </div>
          <button
            type="button"
            onClick={toggleSelectMode}
            aria-label="เลือกบิล"
            aria-pressed={selectMode}
            className={`mk-iconbtn ${selectMode ? "is-active" : ""}`}
          >
            <SquareCheck />
          </button>
        </div>
      </div>

      {/* Selection bar */}
      {selectMode && (
        <div className="mb-3 px-4">
          <div className="mk-selbar flex-wrap">
            <div className="mk-selbar__txt basis-full">
              <div className="mk-selbar__n">
                {selectedCount > 0
                  ? `เลือกไว้ ${selectedCount} บิล`
                  : "ยังไม่ได้เลือกบิล"}
              </div>
              <div className="mk-selbar__s">
                {selectedCount > 0
                  ? `${formatBaht(selectedTotal)} · รับ ${selectedReceipts} · จ่าย ${selectedCount - selectedReceipts}`
                  : "แตะบิลที่ต้องการ แล้วกด Export เพื่อออกเอกสาร"}
              </div>
            </div>
            <div className="grid w-full grid-cols-2 gap-2">
              <button
                type="button"
                onClick={selectAllOrClear}
                className="mk-btn mk-btn--sm mk-btn--outline"
              >
                {selectedCount > 0 ? "ล้างที่เลือก" : "เลือกทั้งหน้า"}
              </button>
              <button
                type="button"
                onClick={() => setExportSheetOpen(true)}
                disabled={selectedCount === 0}
                className="mk-btn mk-btn--sm mk-btn--primary"
              >
                <Download />
                Export
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-col gap-2 px-4">
        {/* Type tabs */}
        <div className="mk-seg" role="group" aria-label="ประเภทบิล">
          {(["all", "receipt", "payment"] as TypeTab[]).map((key) => (
            <button
              key={key}
              type="button"
              aria-pressed={typeTab === key}
              className={key === "all" ? "" : BILL_TYPE_CONFIG[key].theme}
              onClick={() => {
                setTypeTab(key);
                setFilterPeriod(null);
                resetPage();
              }}
            >
              {key === "all" ? "ทั้งหมด" : BILL_TYPE_CONFIG[key].title}
            </button>
          ))}
        </div>

        {/* Summary — always computed from the filtered rows */}
        {typeTab === "all" ? (
          <div className="mk-kpis">
            <div className="mk-kpi">
              <div className="mk-kpi__l">
                <i className="mk-kpi__dot text-receipt-600" />
                รับ
              </div>
              <div className="mk-kpi__v is-in">{formatBaht(income)}</div>
            </div>
            <div className="mk-kpi">
              <div className="mk-kpi__l">
                <i className="mk-kpi__dot text-payment-600" />
                จ่าย
              </div>
              <div className="mk-kpi__v is-out">{formatBaht(expense)}</div>
            </div>
            <div className="mk-kpi">
              <div className="mk-kpi__l">สุทธิ</div>
              <div className="mk-kpi__v">{signedBaht(net)}</div>
            </div>
          </div>
        ) : (
          <div className="mk-kpis">
            <div className="mk-kpi">
              <div className="mk-kpi__l">ยอดรวม</div>
              <div
                className={`mk-kpi__v ${typeTab === "receipt" ? "is-in" : "is-out"}`}
              >
                {formatBaht(sumTotal)}
              </div>
            </div>
            <div className="mk-kpi">
              <div className="mk-kpi__l">เฉลี่ย/บิล</div>
              <div className="mk-kpi__v">
                {formatBaht(filtered.length ? sumTotal / filtered.length : 0)}
              </div>
            </div>
            <div className="mk-kpi">
              <div className="mk-kpi__l">ยังไม่มีสลิป</div>
              <div className="mk-kpi__v">{missingSlipCount} บิล</div>
            </div>
          </div>
        )}
      </div>

      {/* Sticky search / filter bar */}
      <div className="mk-sticky mt-3">
        {searchOpen ? (
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <div className="mk-input-wrap min-w-0 flex-1">
                <input
                  autoFocus
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    resetPage();
                  }}
                  aria-label="คำค้น"
                  placeholder={
                    searchBy === "customer_name"
                      ? "ค้นหาชื่อลูกค้า…"
                      : "ค้นหาที่อยู่…"
                  }
                  className="mk-input min-h-11! py-2"
                />
                {search && (
                  <button
                    type="button"
                    className="mk-affix h-10!"
                    aria-label="ล้างคำค้น"
                    onClick={() => {
                      setSearch("");
                      resetPage();
                    }}
                  >
                    <X size={18} />
                  </button>
                )}
              </div>
              <button
                type="button"
                className="mk-btn mk-btn--primary"
                onClick={() => setSearchOpen(false)}
              >
                เสร็จ
              </button>
            </div>
            <div className="flex items-center gap-2">
              <span className="mk-caption">ค้นจาก</span>
              <button
                type="button"
                className="mk-chip mk-chip--sm"
                aria-pressed={searchBy === "customer_name"}
                onClick={() => {
                  setSearchBy("customer_name");
                  resetPage();
                }}
              >
                ชื่อลูกค้า
              </button>
              <button
                type="button"
                className="mk-chip mk-chip--sm"
                aria-pressed={searchBy === "customer_address"}
                onClick={() => {
                  setSearchBy("customer_address");
                  resetPage();
                }}
              >
                ที่อยู่
              </button>
            </div>
          </div>
        ) : (
          <div className="mk-searchbar">
            <button
              type="button"
              onClick={() => setSearchOpen(true)}
              className={`mk-pillbtn ${search ? "is-set" : ""}`}
            >
              <Search />
              <span>{search ? `“${search}”` : "ค้นหาบิล"}</span>
            </button>
            <button
              type="button"
              onClick={() => setFilterOpen(true)}
              className={`mk-pillbtn mk-pillbtn--narrow ${periodActive ? "is-set" : ""}`}
            >
              <CalendarDays />
              <span>{periodLabel}</span>
            </button>
          </div>
        )}

        {stores.length > 1 && (
          <div className="mk-storechips mt-2">
            <button
              type="button"
              className="mk-chip mk-chip--sm"
              aria-pressed={storeId == null}
              onClick={() => {
                setStoreId(null);
                setFilterPeriod(null);
                resetPage();
              }}
            >
              ทุกร้าน
            </button>
            {stores.map((s) => (
              <button
                key={s.id}
                type="button"
                className="mk-chip mk-chip--sm"
                aria-pressed={storeId === s.id}
                onClick={() => {
                  setStoreId(s.id);
                  setFilterPeriod(null);
                  resetPage();
                }}
              >
                {s.name}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="px-4 pb-6">
        {bills.length === 0 ? (
          <div className="mk-card mt-4">
            <div className="mk-empty">
              <div className="mk-empty__ic">
                <Inbox />
              </div>
              <h3>ยังไม่มีบิล</h3>
              <p>เริ่มออกบิลแรกของร้านได้จากปุ่มด้านล่าง</p>
              <button
                type="button"
                className="mk-btn mk-btn--primary"
                onClick={() => setTypeSheetOpen(true)}
              >
                <Plus />
                สร้างบิล
              </button>
            </div>
          </div>
        ) : slice.length === 0 ? (
          <div className="mk-card mt-4">
            <div className="mk-empty">
              <div className="mk-empty__ic">
                <SearchX />
              </div>
              <h3>ไม่พบบิลที่ค้นหา</h3>
              <p>ลองเปลี่ยนคำค้น หรือสลับไปค้นจากที่อยู่</p>
              <button
                type="button"
                className="mk-btn mk-btn--outline"
                onClick={clearEverything}
              >
                ล้างการค้นหา
              </button>
            </div>
          </div>
        ) : (
          <>
            {groups.map((g) => (
              <div key={g.key}>
                <div className="mk-daygroup">
                  <span>{g.label}</span>
                  <span className="num">{g.rows.length} บิล</span>
                </div>
                <div className="mk-rows">
                  {g.rows.map((bill) => (
                    <BillRow
                      key={bill.id}
                      bill={bill}
                      selectMode={selectMode}
                      selected={!!selected[bill.id]}
                      onToggle={() => toggleSelected(bill.id)}
                    />
                  ))}
                </div>
              </div>
            ))}

            <div className="mk-pager">
              <button
                type="button"
                className="mk-btn mk-btn--outline w-11 px-0!"
                aria-label="หน้าก่อน"
                disabled={currentPage <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                <ChevronLeft />
              </button>
              <span className="mk-pager__t">
                หน้า {currentPage}/{totalPages} · แสดง {slice.length} จาก{" "}
                {filtered.length}
              </span>
              <button
                type="button"
                className="mk-btn mk-btn--outline w-11 px-0!"
                aria-label="หน้าถัดไป"
                disabled={currentPage >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              >
                <ChevronRight />
              </button>
            </div>
          </>
        )}
      </div>

      {/* Period filter sheet */}
      <Sheet
        open={filterOpen}
        onClose={() => setFilterOpen(false)}
        label="ช่วงเวลา"
      >
        <h2 className="mk-h2">ช่วงเวลา</h2>
        <p className="mt-0.5 mb-4 text-[14px] text-ink-muted">
          ยอดและจำนวนบิลอัปเดตทันทีที่เลือก
        </p>
        <div className="mk-seg">
          {FILTER_MODES.map((m) => (
            <button
              key={m.key}
              type="button"
              className="is-sand"
              aria-pressed={filterMode === m.key}
              onClick={() => {
                setFilterMode(m.key);
                setFilterPeriod(null);
                resetPage();
              }}
            >
              {m.label}
            </button>
          ))}
        </div>
        {periodsForMode.length > 0 && (
          <div className="mk-chips mt-3.5">
            {periodsForMode.map((p) => (
              <button
                key={p.key}
                type="button"
                className="mk-chip"
                aria-pressed={p.key === activePeriodKey}
                onClick={() => {
                  setFilterPeriod(p.key);
                  resetPage();
                }}
              >
                <b>{periodLabelOf(p.key, filterMode)}</b>
                <small>
                  {p.count} บิล · {signedBaht(p.total)}
                </small>
              </button>
            ))}
          </div>
        )}
        <div className="mk-grid2 mt-5">
          <button
            type="button"
            className="mk-btn mk-btn--outline mk-btn--lg text-error!"
            onClick={() => {
              setFilterMode("all");
              setFilterPeriod(null);
              resetPage();
              setFilterOpen(false);
            }}
          >
            ล้างตัวกรอง
          </button>
          <button
            type="button"
            className="mk-btn mk-btn--primary mk-btn--lg"
            onClick={() => setFilterOpen(false)}
          >
            ใช้ตัวกรอง
          </button>
        </div>
      </Sheet>

      {/* Export sheet */}
      <Sheet
        open={exportSheetOpen}
        onClose={() => setExportSheetOpen(false)}
        label="Export"
      >
        <div className="mk-eyebrow">EXPORT · A4 แนวตั้ง</div>
        <h2 className="mk-h2">เลือกรูปแบบเอกสาร</h2>
        <p className="num mt-0.5 mb-4 text-[14px] text-ink-muted">
          เลือกไว้ {selectedCount} บิล · {formatBaht(selectedTotal)}
        </p>
        <button
          type="button"
          className="mk-typecard [--type-100:var(--surface-sunken)] [--type-200:var(--line)] [--type-text:var(--ink)] [--type:var(--ink)]"
          onClick={() => exportTo("summary")}
        >
          <span className="mk-typecard__ic">
            <List />
          </span>
          <span className="min-w-0 flex-1">
            <b>เอกสารสรุปสินค้า</b>
            <small>
              ตารางรวมทุกบิล + สรุปน้ำหนักต่อสินค้าและยอดรวมท้ายตาราง
            </small>
          </span>
        </button>
        <button
          type="button"
          className="mk-typecard [--type-100:var(--sand-100)] [--type-200:var(--sand-200)] [--type-text:var(--ink)] [--type:var(--sand-500)]"
          onClick={() => exportTo("receipt")}
        >
          <span className="mk-typecard__ic text-ink!">
            <FileText />
          </span>
          <span className="min-w-0 flex-1">
            <b>ใบเสร็จ / ใบสำคัญจ่าย</b>
            <small>หนึ่งใบต่อหนึ่งบิล · ครึ่งบนข้อมูลบิล ครึ่งล่างสลิป</small>
          </span>
        </button>
        <button
          type="button"
          className="mk-btn mk-btn--outline mk-btn--block mk-btn--lg mt-4"
          onClick={() => setExportSheetOpen(false)}
        >
          ยกเลิก
        </button>
      </Sheet>

      <BillTypeSheet
        open={typeSheetOpen}
        onClose={() => setTypeSheetOpen(false)}
        onSelect={(type) => router.push(`/create?type=${type}`)}
      />
    </div>
  );
}

function BillRow({
  bill,
  selectMode,
  selected,
  onToggle,
}: {
  bill: BillListItem;
  selectMode: boolean;
  selected: boolean;
  onToggle: () => void;
}) {
  const config = BILL_TYPE_CONFIG[bill.type];
  const Arrow = bill.type === "receipt" ? ArrowDown : ArrowUp;
  const className = `mk-billrow ${config.theme} ${selectMode && selected ? "is-selected" : ""}`;

  const content = (
    <>
      {selectMode ? (
        <span className="mk-check">
          <Check strokeWidth={3} />
        </span>
      ) : (
        <span className="mk-billrow__icon">
          <Arrow strokeWidth={2.2} />
        </span>
      )}
      <span className="mk-billrow__main">
        <span className="mk-billrow__badges">
          <span className="mk-badge mk-badge--type">
            {config.title} #{bill.receiptNo}
          </span>
          {!bill.hasSlip && (
            <span className="mk-badge mk-badge--noslip">
              <Paperclip />
              ยังไม่มีสลิป
            </span>
          )}
        </span>
        <span className="mk-billrow__name block">{bill.customerName}</span>
        <span className="mk-billrow__addr block">
          {bill.storeName ? `${bill.storeName} · ` : ""}
          {bill.customerAddress}
        </span>
      </span>
      <span className="mk-billrow__right">
        <span className="mk-billrow__amt block">
          {bill.type === "payment" ? "−" : ""}
          {formatBaht(bill.total)}
        </span>
        <span className="mk-billrow__meta block">
          {timeOf(bill.createdAt)} · {bill.itemCount} รายการ
        </span>
      </span>
      {!selectMode && <ChevronRight className="mk-billrow__chev" />}
    </>
  );

  return selectMode ? (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={selected}
      className={className}
    >
      {content}
    </button>
  ) : (
    <Link href={`/bills/${bill.id}`} className={className}>
      {content}
    </Link>
  );
}
