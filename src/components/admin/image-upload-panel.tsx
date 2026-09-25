"use client";

import { useState } from "react";
import { ImageIcon, X } from "lucide-react";
import { useToast } from "@/components/toast-provider";
import OverlayPortal from "@/components/overlay-portal";

// Generic attach/change/remove panel for a single image field — the same
// shape as bills/slip-panel.tsx, generalized so it can back a store's logo
// and a user's signature too instead of duplicating the whole component per
// field.
export default function ImageUploadPanel({
  label,
  imageUrl,
  onUpload,
  onDelete,
  onChange,
  emptyLabel = "แตะเพื่ออัปโหลด",
}: {
  label: string;
  imageUrl: string | null;
  onUpload: (file: File) => Promise<string>;
  onDelete: () => Promise<void>;
  onChange: (url: string | null) => void;
  emptyLabel?: string;
}) {
  const { showToast } = useToast();
  const [busy, setBusy] = useState(false);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [confirmRemoveOpen, setConfirmRemoveOpen] = useState(false);

  async function handleFile(file: File | null) {
    if (!file) return;
    setBusy(true);
    try {
      const url = await onUpload(file);
      onChange(url);
      showToast(imageUrl ? `เปลี่ยน${label}แล้ว` : `อัปโหลด${label}แล้ว`);
    } catch (err) {
      showToast(err instanceof Error ? err.message : `อัปโหลด${label}ไม่สำเร็จ`);
    } finally {
      setBusy(false);
    }
  }

  async function handleRemove() {
    setBusy(true);
    try {
      await onDelete();
      onChange(null);
      setConfirmRemoveOpen(false);
      showToast(`ลบ${label}แล้ว`);
    } catch (err) {
      showToast(err instanceof Error ? err.message : `ลบ${label}ไม่สำเร็จ`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <div>
        <label className="mb-2.5 block text-[10px] font-semibold tracking-[.13em] text-ink/55 uppercase">
          {label}
        </label>
        {imageUrl ? (
          <>
            <button
              type="button"
              onClick={() => setLightboxOpen(true)}
              className="relative block h-[130px] w-full cursor-zoom-in overflow-hidden border border-divider bg-surface p-0"
            >
              <div
                role="img"
                aria-label={label}
                className="h-full w-full bg-contain bg-center bg-no-repeat"
                style={{ backgroundImage: `url("${imageUrl}")` }}
              />
            </button>
            <div className="mt-2.5 flex gap-2">
              <label className="flex min-h-11 flex-1 cursor-pointer items-center justify-center border border-divider bg-transparent text-[12.5px] font-semibold">
                {busy ? "กำลังอัปโหลด…" : "เปลี่ยนรูป"}
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
                ลบรูป
              </button>
            </div>
          </>
        ) : (
          <label className="flex h-[110px] cursor-pointer flex-col items-start justify-center gap-2 border border-dashed border-divider px-[18px] text-ink/45">
            <ImageIcon size={20} strokeWidth={1.6} />
            <div className="text-[13px] font-semibold">
              {busy ? "กำลังอัปโหลด…" : emptyLabel}
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

      {lightboxOpen && imageUrl && (
        <OverlayPortal>
          <div
            onClick={() => setLightboxOpen(false)}
            className="fixed inset-0 z-[60] flex flex-col bg-[rgba(10,16,12,0.94)] [animation:fadeIn_0.18s_ease_both]"
          >
            <div className="flex items-center justify-between px-[18px] py-4 text-white">
              <div className="text-[12px] font-semibold">{label}</div>
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
                aria-label={label}
                className="h-full w-full bg-center bg-no-repeat"
                style={{ backgroundImage: `url("${imageUrl}")`, backgroundSize: "contain" }}
              />
            </div>
          </div>
        </OverlayPortal>
      )}

      {confirmRemoveOpen && (
        <OverlayPortal>
          <div
            onClick={() => setConfirmRemoveOpen(false)}
            className="fixed inset-0 z-[70] flex items-end justify-center bg-[rgba(10,16,12,0.55)] [animation:fadeIn_0.16s_ease_both]"
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-[430px] border-t-2 border-divider bg-surface px-5 pt-6 pb-7 [animation:riseIn_0.2s_ease_both]"
            >
              <h3 className="text-[20px] leading-[1.3] font-bold">ลบ{label}นี้?</h3>
              <p className="mt-2.5 mb-5 text-[13px] leading-[1.6] text-ink/60">
                ต้องอัปโหลดใหม่ภายหลังถ้าต้องการ
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
                  {busy ? "กำลังลบ…" : "ลบรูป"}
                </button>
              </div>
            </div>
          </div>
        </OverlayPortal>
      )}
    </>
  );
}
