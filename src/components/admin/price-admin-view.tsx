"use client";

import { useState } from "react";
import Link from "next/link";
import { Check, ChevronDown, ChevronLeft, Pencil } from "lucide-react";
import {
  getStoreBasePrices,
  updateStoreProductPrice,
  type StoreBasePrice,
} from "@/lib/api/prices";
import { formatBaht } from "@/lib/format";
import { useToast } from "@/components/toast-provider";
import type { Store } from "@/lib/types";

export default function PriceAdminView({ stores }: { stores: Store[] }) {
  const { showToast } = useToast();
  const [storeId, setStoreId] = useState<number | null>(null);
  const [prices, setPrices] = useState<StoreBasePrice[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [draft, setDraft] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleStoreChange(value: string) {
    const nextStoreId = value ? Number(value) : null;
    setStoreId(nextStoreId);
    setPrices([]);
    if (nextStoreId == null) return;

    setLoading(true);
    try {
      const data = await getStoreBasePrices(nextStoreId);
      setPrices(data);
    } catch {
      showToast("โหลดราคาไม่สำเร็จ");
    } finally {
      setLoading(false);
    }
  }

  function startEdit(item: StoreBasePrice) {
    setEditingId(item.productId);
    setDraft(String(item.price));
  }

  async function saveEdit(productId: number) {
    if (storeId == null) return;
    const price = parseFloat(draft);
    if (!(price > 0)) {
      showToast("ราคาต้องมากกว่า 0");
      return;
    }
    setSaving(true);
    try {
      const updated = await updateStoreProductPrice(storeId, productId, price);
      setPrices((prev) =>
        prev.map((p) => (p.productId === productId ? updated : p)),
      );
      setEditingId(null);
      showToast("บันทึกราคาแล้ว");
    } catch (err) {
      showToast(err instanceof Error ? err.message : "บันทึกราคาไม่สำเร็จ");
    } finally {
      setSaving(false);
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
          จัดการราคา
        </h1>
        <p className="mt-1.5 text-[12.5px] leading-[1.6] text-ink/55">
          ราคานี้เป็นราคาปกติต่อหน่วย — ถ้ามีโปรโมชั่นกำลังทำงานอยู่
          ระบบจะใช้ราคาโปรแทนตอนออกบิลโดยอัตโนมัติ
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
          {prices.map((item) => (
            <div
              key={item.productId}
              className="flex items-center gap-3 border-b-2 border-divider bg-surface px-5 py-4"
            >
              <div className="min-w-0 flex-1">
                <div className="text-[14px] font-semibold">
                  {item.productName}
                </div>
                <div className="mt-0.5 text-[11px] text-ink/50">
                  ต่อ {item.unit}
                </div>
              </div>
              {editingId === item.productId ? (
                <div className="flex items-center gap-2">
                  <input
                    autoFocus
                    value={draft}
                    onChange={(e) =>
                      setDraft(e.target.value.replace(/[^0-9.]/g, ""))
                    }
                    inputMode="decimal"
                    className="font-num h-11 w-24 border border-accent bg-bg px-2.5 text-right text-[15px] font-bold outline-none"
                  />
                  <button
                    type="button"
                    disabled={saving}
                    onClick={() => saveEdit(item.productId)}
                    className="flex h-11 w-11 flex-none items-center justify-center bg-accent text-white disabled:opacity-60"
                  >
                    <Check size={16} />
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => startEdit(item)}
                  className="flex items-center gap-2 border border-divider bg-bg px-3 py-2.5 text-[14.5px] font-bold"
                >
                  {formatBaht(item.price)}
                  <Pencil size={13} className="text-ink/45" />
                </button>
              )}
            </div>
          ))}
          {prices.length === 0 && (
            <div className="px-5 py-10 text-center text-[13px] text-ink/50">
              ยังไม่มีราคาที่ตั้งไว้ของสาขานี้
            </div>
          )}
        </div>
      )}
    </div>
  );
}
