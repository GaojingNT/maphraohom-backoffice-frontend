"use client";

import { useState } from "react";
import { ImageIcon, X } from "lucide-react";
import { deleteSlip, uploadSlip } from "@/lib/api/bills";
import { useToast } from "@/components/toast-provider";

// Attach/change/remove a bill's slip — talks directly to the dedicated
// PUT/DELETE /bills/:id/slip endpoints (slips are managed independently of
// the bill's own fields, so this never touches the rest of the bill).
export default function SlipPanel({
  billId,
  receiptNo,
  slipUrl,
  onChange,
}: {
  billId: number;
  receiptNo: number;
  slipUrl: string | null;
  onChange: (slipUrl: string | null) => void;
}) {
  const { showToast } = useToast();
  const [busy, setBusy] = useState(false);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [confirmRemoveOpen, setConfirmRemoveOpen] = useState(false);

  async function handleFile(file: File | null) {
    if (!file) return;
    setBusy(true);
    try {
      const url = await uploadSlip(billId, file);
      onChange(url);
      showToast(slipUrl ? "เปลี่ยนสลิปแล้ว" : "แนบสลิปแล้ว");
    } catch (err) {
      showToast(err instanceof Error ? err.message : "แนบสลิปไม่สำเร็จ");
    } finally {
      setBusy(false);
    }
  }

  async function handleRemove() {
    setBusy(true);
    try {
      await deleteSlip(billId);
      onChange(null);
      setConfirmRemoveOpen(false);
      showToast("ลบสลิปแล้ว");
    } catch (err) {
      showToast(err instanceof Error ? err.message : "ลบสลิปไม่สำเร็จ");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <div className="border-b-2 border-divider px-5 py-5">
        <div className="mb-3 text-[10px] font-semibold tracking-[.14em] text-ink/50 uppercase">
          สลิปโอนเงิน
        </div>
        {slipUrl ? (
          <>
            <button
              type="button"
              onClick={() => setLightboxOpen(true)}
              className="relative block h-[200px] w-full cursor-zoom-in overflow-hidden border border-divider bg-surface p-0"
            >
              <div
                role="img"
                aria-label="สลิปโอนเงิน"
                className="h-full w-full bg-cover bg-center"
                style={{ backgroundImage: `url("${slipUrl}")` }}
              />
              <span className="absolute right-0 bottom-0 bg-ink px-[11px] py-[9px] text-[11px] font-semibold text-white">
                แตะเพื่อดูเต็มจอ
              </span>
            </button>
            <div className="mt-2.5 flex gap-2">
              <label className="flex min-h-11 flex-1 cursor-pointer items-center justify-center border border-divider bg-transparent text-[12.5px] font-semibold">
                {busy ? "กำลังอัปโหลด…" : "เปลี่ยนสลิป"}
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  disabled={busy}
                  onChange={(e) => handleFile(e.target.files?.[0] ?? null)}
                  className="hidden"
                />
              </label>
              <button
                type="button"
                disabled={busy}
                onClick={() => setConfirmRemoveOpen(true)}
                className="min-h-11 flex-1 border border-divider bg-transparent text-[12.5px] font-semibold text-danger disabled:opacity-60"
              >
                ลบสลิป
              </button>
            </div>
          </>
        ) : (
          <label className="flex h-[130px] cursor-pointer flex-col items-start justify-center gap-2 border border-dashed border-divider px-[18px] text-ink/45">
            <ImageIcon size={22} strokeWidth={1.6} />
            <div className="text-[13px] font-semibold">
              {busy ? "กำลังอัปโหลด…" : "แตะเพื่อแนบสลิป"}
            </div>
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              disabled={busy}
              onChange={(e) => handleFile(e.target.files?.[0] ?? null)}
              className="hidden"
            />
          </label>
        )}
      </div>

      {lightboxOpen && slipUrl && (
        <div
          onClick={() => setLightboxOpen(false)}
          className="fixed inset-0 z-[60] flex flex-col bg-[rgba(10,16,12,0.94)] [animation:fadeIn_0.18s_ease_both]"
        >
          <div className="flex items-center justify-between px-[18px] py-4 text-white">
            <div className="text-[12px] font-semibold">สลิป · {receiptNo}</div>
            <button
              type="button"
              onClick={() => setLightboxOpen(false)}
              className="flex h-11 w-11 items-center justify-center border border-white/35 bg-transparent text-white"
            >
              <X size={18} />
            </button>
          </div>
          <div className="flex flex-1 items-center justify-center px-4 pb-7">
            <div
              role="img"
              aria-label="สลิปเต็มจอ"
              className="h-full w-full bg-center bg-no-repeat"
              style={{ backgroundImage: `url("${slipUrl}")`, backgroundSize: "contain" }}
            />
          </div>
        </div>
      )}

      {confirmRemoveOpen && (
        <div
          onClick={() => setConfirmRemoveOpen(false)}
          className="fixed inset-0 z-[70] flex items-end justify-center bg-[rgba(10,16,12,0.55)] [animation:fadeIn_0.16s_ease_both]"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-[430px] border-t-2 border-divider bg-surface px-5 pt-6 pb-7 [animation:riseIn_0.2s_ease_both]"
          >
            <h3 className="text-[20px] leading-[1.3] font-bold">ลบสลิปนี้?</h3>
            <p className="mt-2.5 mb-5 text-[13px] leading-[1.6] text-ink/60">
              ต้องแนบใหม่ภายหลังถ้าต้องการ
            </p>
            <div className="flex gap-2.5">
              <button
                type="button"
                onClick={() => setConfirmRemoveOpen(false)}
                disabled={busy}
                className="min-h-[50px] flex-1 border border-divider bg-transparent text-[14px] font-semibold disabled:opacity-60"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={handleRemove}
                disabled={busy}
                className="min-h-[50px] flex-1 bg-danger text-[14px] font-semibold text-white disabled:opacity-60"
              >
                {busy ? "กำลังลบ…" : "ลบสลิป"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
