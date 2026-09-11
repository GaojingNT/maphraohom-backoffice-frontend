"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronDown, ChevronLeft, Pencil, Plus, Trash2, X } from "lucide-react";
import type { ProductListItem } from "@/lib/api/products";
import {
  createPromotion,
  deletePromotion,
  getPromotion,
  getPromotions,
  updatePromotion,
  type PromotionDetail,
  type PromotionListItem,
} from "@/lib/api/promotions";
import { useToast } from "@/components/toast-provider";
import type { Store } from "@/lib/types";

function formatRange(startsAt: string, endsAt: string): string {
  const fmt = (s: string) =>
    new Date(s.replace(" ", "T")).toLocaleDateString("th-TH", {
      day: "numeric",
      month: "short",
      year: "2-digit",
    });
  return `${fmt(startsAt)} – ${fmt(endsAt)}`;
}

// "YYYY-MM-DD HH:mm:ss" (backend) -> "YYYY-MM-DD" (date input)
function toDateValue(s: string): string {
  return s.slice(0, 10);
}

type SheetState = { mode: "create" } | { mode: "edit"; promotion: PromotionDetail };

export default function PromotionAdminView({
  stores,
  products,
}: {
  stores: Store[];
  products: ProductListItem[];
}) {
  const { showToast } = useToast();
  const [storeId, setStoreId] = useState<number | null>(null);
  const [promotions, setPromotions] = useState<PromotionListItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [sheet, setSheet] = useState<SheetState | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<PromotionListItem | null>(
    null,
  );
  const [deleting, setDeleting] = useState(false);

  async function reload(id: number) {
    setLoading(true);
    try {
      setPromotions(await getPromotions(id));
    } catch {
      showToast("โหลดโปรโมชั่นไม่สำเร็จ");
    } finally {
      setLoading(false);
    }
  }

  function handleStoreChange(value: string) {
    const nextStoreId = value ? Number(value) : null;
    setStoreId(nextStoreId);
    setPromotions([]);
    if (nextStoreId != null) reload(nextStoreId);
  }

  async function handleEditClick(id: number) {
    try {
      const promotion = await getPromotion(id);
      setSheet({ mode: "edit", promotion });
    } catch {
      showToast("โหลดรายละเอียดโปรไม่สำเร็จ");
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deletePromotion(deleteTarget.id);
      showToast(`ลบโปร "${deleteTarget.name}" แล้ว`);
      setDeleteTarget(null);
      if (storeId != null) reload(storeId);
    } catch (err) {
      showToast(err instanceof Error ? err.message : "ลบโปรไม่สำเร็จ");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="flex flex-1 flex-col pb-24">
      <div className="border-b-2 border-divider px-5 pt-4 pb-4">
        <Link
          href="/admin"
          className="flex items-center gap-[7px] py-1 text-[13px] font-semibold text-accent"
        >
          <ChevronLeft size={16} />
          กลับ
        </Link>
        <h1 className="mt-2.5 text-[26px] leading-[1.2] font-bold">
          จัดการโปรโมชั่น
        </h1>
        <p className="mt-1.5 text-[12.5px] leading-[1.6] text-ink/55">
          แต่ละสาขามีโปร active ได้ครั้งละ 1 โปรเท่านั้น
          ช่วงเวลาที่ทับกับโปรเดิมจะสร้างไม่ได้
        </p>
      </div>

      <div className="border-b-2 border-divider bg-surface p-5">
        <label className="mb-2.5 block text-[10px] font-semibold tracking-[.13em] text-ink/55 uppercase">
          สาขา
        </label>
        <div className="relative border border-divider bg-bg">
          <select
            value={storeId ?? ""}
            onChange={(e) => handleStoreChange(e.target.value)}
            className="h-[50px] w-full cursor-pointer appearance-none border-0 bg-transparent px-[13px] pr-11 text-[14.5px] font-semibold outline-none"
          >
            <option value="">— เลือกสาขา —</option>
            {stores.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
          <ChevronDown
            size={15}
            strokeWidth={2.2}
            className="pointer-events-none absolute top-[18px] right-3.5 text-ink/50"
          />
        </div>
      </div>

      <div className="px-5 py-4">
        <button
          type="button"
          disabled={storeId == null}
          onClick={() => setSheet({ mode: "create" })}
          className="flex min-h-12 w-full items-center justify-center gap-[9px] border border-accent bg-accent-100 px-3.5 text-[13px] font-semibold text-accent hover:bg-accent-200 disabled:opacity-50"
        >
          <Plus size={16} strokeWidth={2.2} />
          สร้างโปรโมชั่นใหม่
        </button>
      </div>

      {storeId == null ? (
        <div className="px-5 py-10 text-center text-[13px] text-ink/50">
          เลือกสาขาด้านบนก่อน
        </div>
      ) : loading ? (
        <div className="px-5 py-10 text-center text-[13px] text-ink/50">
          กำลังโหลด…
        </div>
      ) : (
        <div className="flex flex-col">
          {promotions.map((p) => (
            <div
              key={p.id}
              className="flex items-center gap-3 border-b-2 border-divider bg-surface px-5 py-4"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5 text-[14px] font-semibold">
                  {p.name}
                  {p.isActive && (
                    <span className="bg-accent-100 px-1.5 py-0.5 text-[10px] font-semibold text-accent">
                      กำลังโปร
                    </span>
                  )}
                </div>
                <div className="font-num mt-1 text-[11.5px] text-ink/50">
                  {formatRange(p.startsAt, p.endsAt)}
                </div>
              </div>
              <button
                type="button"
                onClick={() => handleEditClick(p.id)}
                className="flex h-9 w-9 flex-none items-center justify-center border border-divider bg-transparent"
              >
                <Pencil size={14} />
              </button>
              <button
                type="button"
                onClick={() => setDeleteTarget(p)}
                className="flex h-9 w-9 flex-none items-center justify-center border border-divider bg-transparent text-danger"
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))}
          {promotions.length === 0 && (
            <div className="px-5 py-10 text-center text-[13px] text-ink/50">
              สาขานี้ยังไม่มีโปรโมชั่น
            </div>
          )}
        </div>
      )}

      {sheet && storeId != null && (
        <PromotionSheet
          storeId={storeId}
          products={products}
          editing={sheet.mode === "edit" ? sheet.promotion : undefined}
          onClose={() => setSheet(null)}
          onSaved={() => {
            setSheet(null);
            reload(storeId);
          }}
        />
      )}

      {deleteTarget && (
        <div className="fixed inset-0 z-[70] flex items-end justify-center bg-[rgba(10,16,12,0.55)] [animation:fadeIn_0.16s_ease_both]">
          <div className="w-full max-w-[430px] border-t-2 border-divider bg-surface px-5 pt-6 pb-7 [animation:riseIn_0.2s_ease_both]">
            <h3 className="text-[20px] leading-[1.3] font-bold">
              ลบโปร &quot;{deleteTarget.name}&quot;?
            </h3>
            <p className="mt-2.5 mb-5 text-[13px] leading-[1.6] text-ink/60">
              บิลที่เคยขายช่วงโปรนี้จะยังเก็บราคาเดิมไว้
              แต่จะไม่ผูกกับโปรนี้อีกต่อไป
            </p>
            <div className="flex gap-2.5">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                disabled={deleting}
                className="min-h-[50px] flex-1 border border-divider bg-transparent text-[14px] font-semibold disabled:opacity-60"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={deleting}
                className="min-h-[50px] flex-1 bg-danger text-[14px] font-semibold text-white disabled:opacity-60"
              >
                {deleting ? "กำลังลบ…" : "ลบโปร"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

interface ItemRow {
  productId: number;
  checked: boolean;
  price: string;
}

function PromotionSheet({
  storeId,
  products,
  editing,
  onClose,
  onSaved,
}: {
  storeId: number;
  products: ProductListItem[];
  editing?: PromotionDetail;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { showToast } = useToast();
  const isEditing = !!editing;
  const [name, setName] = useState(editing?.name ?? "");
  const [startsAt, setStartsAt] = useState(
    editing ? toDateValue(editing.startsAt) : "",
  );
  const [endsAt, setEndsAt] = useState(
    editing ? toDateValue(editing.endsAt) : "",
  );
  const [rows, setRows] = useState<ItemRow[]>(() =>
    products.map((p) => {
      const existing = editing?.items.find((it) => it.productId === p.id);
      return {
        productId: p.id,
        checked: !!existing,
        price: existing ? String(existing.price) : "",
      };
    }),
  );
  const [submitting, setSubmitting] = useState(false);

  function toggleRow(productId: number) {
    setRows((prev) =>
      prev.map((r) =>
        r.productId === productId ? { ...r, checked: !r.checked } : r,
      ),
    );
  }
  function setRowPrice(productId: number, price: string) {
    setRows((prev) =>
      prev.map((r) =>
        r.productId === productId
          ? { ...r, price: price.replace(/[^0-9.]/g, "") }
          : r,
      ),
    );
  }

  async function handleSubmit() {
    const selected = rows.filter((r) => r.checked);
    if (!name.trim()) return showToast("กรอกชื่อโปรโมชั่น");
    if (!startsAt || !endsAt) return showToast("กรอกช่วงวันที่ให้ครบ");
    if (new Date(endsAt) < new Date(startsAt))
      return showToast("วันสิ้นสุดต้องไม่ก่อนวันเริ่ม");
    if (selected.length === 0) return showToast("เลือกสินค้าอย่างน้อย 1 รายการ");
    if (selected.some((r) => !(parseFloat(r.price) > 0)))
      return showToast("กรอกราคาโปรของทุกสินค้าที่เลือก");

    // Time is locked, not user-editable: promotions always run midnight to
    // midnight — 00:00:00 on the start date through 23:59:59 on the end date.
    const payload = {
      name: name.trim(),
      storeId,
      startsAt: new Date(`${startsAt}T00:00:00`).toISOString(),
      endsAt: new Date(`${endsAt}T23:59:59`).toISOString(),
      items: selected.map((r) => ({
        productId: r.productId,
        price: parseFloat(r.price),
      })),
    };

    setSubmitting(true);
    try {
      if (editing) {
        await updatePromotion(editing.id, payload);
        showToast("บันทึกการแก้ไขแล้ว");
      } else {
        await createPromotion(payload);
        showToast("สร้างโปรโมชั่นแล้ว");
      }
      onSaved();
    } catch (err) {
      showToast(
        err instanceof Error
          ? err.message
          : isEditing
            ? "บันทึกการแก้ไขไม่สำเร็จ"
            : "สร้างโปรโมชั่นไม่สำเร็จ",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center bg-[rgba(10,16,12,0.55)] [animation:fadeIn_0.16s_ease_both]">
      <div className="flex max-h-[88vh] w-full max-w-[430px] flex-col border-t-2 border-divider bg-surface [animation:riseIn_0.2s_ease_both]">
        <div className="flex items-center justify-between border-b-2 border-divider px-5 py-4">
          <h3 className="text-[17px] font-bold">
            {isEditing ? "แก้ไขโปรโมชั่น" : "สร้างโปรโมชั่นใหม่"}
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center border-0 bg-transparent"
          >
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          <label className="mb-2 block text-[10px] font-semibold tracking-[.13em] text-ink/55 uppercase">
            ชื่อโปรโมชั่น
          </label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="เช่น โปรโมชั่นปีใหม่ 2569"
            className="h-12 w-full border border-divider bg-bg px-[13px] text-[15px] outline-none"
          />

          <div className="mt-4 grid grid-cols-2 gap-3">
            <div>
              <label className="mb-2 block text-[10px] font-semibold tracking-[.13em] text-ink/55 uppercase">
                เริ่มโปร
              </label>
              <input
                type="date"
                value={startsAt}
                onChange={(e) => setStartsAt(e.target.value)}
                className="h-12 w-full border border-divider bg-bg px-[10px] text-[13.5px] outline-none"
              />
            </div>
            <div>
              <label className="mb-2 block text-[10px] font-semibold tracking-[.13em] text-ink/55 uppercase">
                สิ้นสุดโปร
              </label>
              <input
                type="date"
                value={endsAt}
                min={startsAt || undefined}
                onChange={(e) => setEndsAt(e.target.value)}
                className="h-12 w-full border border-divider bg-bg px-[10px] text-[13.5px] outline-none"
              />
            </div>
          </div>
          <p className="mt-2 text-[11px] leading-[1.5] text-ink/45">
            โปรจะเริ่มตั้งแต่ 00:00 น. ของวันเริ่ม ถึง 23:59 น. ของวันสิ้นสุด
          </p>

          <label className="mt-5 mb-2 block text-[10px] font-semibold tracking-[.13em] text-ink/55 uppercase">
            สินค้าที่ร่วมโปร + ราคาพิเศษ
          </label>
          <div className="flex flex-col gap-2">
            {rows.map((row) => {
              const product = products.find((p) => p.id === row.productId)!;
              return (
                <div
                  key={row.productId}
                  className={`flex items-center gap-2.5 border px-3 py-2.5 ${
                    row.checked ? "border-accent bg-accent-100" : "border-divider bg-bg"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={row.checked}
                    onChange={() => toggleRow(row.productId)}
                    className="h-4 w-4 flex-none accent-current"
                  />
                  <span className="min-w-0 flex-1 truncate text-[13px] font-semibold">
                    {product.name}
                  </span>
                  {row.checked && (
                    <input
                      value={row.price}
                      onChange={(e) => setRowPrice(row.productId, e.target.value)}
                      inputMode="decimal"
                      placeholder="ราคาโปร"
                      className="font-num h-9 w-20 flex-none border border-divider bg-surface px-2 text-right text-[13.5px] font-bold outline-none"
                    />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <div className="flex gap-2.5 border-t-2 border-divider px-5 py-3.5">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="min-h-[50px] flex-1 border border-divider bg-transparent text-[14px] font-semibold disabled:opacity-60"
          >
            ยกเลิก
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={submitting}
            className="min-h-[50px] flex-1 bg-accent text-[14px] font-semibold text-white disabled:opacity-60"
          >
            {submitting
              ? "กำลังบันทึก…"
              : isEditing
                ? "บันทึกการแก้ไข"
                : "สร้างโปร"}
          </button>
        </div>
      </div>
    </div>
  );
}
