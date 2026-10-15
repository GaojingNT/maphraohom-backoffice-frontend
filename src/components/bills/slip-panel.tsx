"use client";

import { useEffect, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Maximize,
  Plus,
  Trash2,
  TriangleAlert,
  Upload,
  X,
} from "lucide-react";
import { addSlip, deleteSlip, MAX_SLIPS_PER_BILL } from "@/lib/api/bills";
import { formatDateShort } from "@/lib/format";
import type { BillSlip } from "@/lib/types";
import { useToast } from "@/components/toast-provider";
import OverlayPortal from "@/components/overlay-portal";
import { ConfirmDelete } from "@/components/ui/overlay";

// Attach/remove a bill's slips (up to MAX_SLIPS_PER_BILL) — talks directly
// to the dedicated POST/DELETE /bills/:id/slips endpoints (slips are managed
// independently of the bill's own fields, so this never touches the rest of
// the bill).
export default function SlipPanel({
  billId,
  receiptNo,
  slips,
  slipUploadedAt,
  lightboxRequest = 0,
  onChange,
}: {
  billId: number;
  receiptNo: number;
  slips: BillSlip[];
  slipUploadedAt: string | null;
  /** Bumped by the parent (the ⋯ menu) to open the full-screen view. */
  lightboxRequest?: number;
  onChange: (slips: BillSlip[]) => void;
}) {
  const { showToast } = useToast();
  const [uploading, setUploading] = useState(false);
  const [removing, setRemoving] = useState(false);
  // Index into `slips` shown full-screen, or null when closed.
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [confirmRemove, setConfirmRemove] = useState<BillSlip | null>(null);
  const [seenRequest, setSeenRequest] = useState(lightboxRequest);

  // Open when the parent asks (adjusting state while rendering, the
  // React-recommended way to respond to a prop change).
  if (lightboxRequest !== seenRequest) {
    setSeenRequest(lightboxRequest);
    if (slips.length > 0) setLightboxIndex(0);
  }

  const room = MAX_SLIPS_PER_BILL - slips.length;
  const shown =
    lightboxIndex != null && lightboxIndex < slips.length
      ? lightboxIndex
      : null;

  useEffect(() => {
    if (shown == null) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setLightboxIndex(null);
      if (e.key === "ArrowLeft") step(-1);
      if (e.key === "ArrowRight") step(1);
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  });

  function step(delta: number) {
    setLightboxIndex((i) =>
      i == null ? i : (i + delta + slips.length) % slips.length,
    );
  }

  // One request per image, in the order picked; a failure doesn't stop the
  // rest.
  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    const picked = Array.from(files).slice(0, room);
    const limitNote =
      files.length > room
        ? ` · เกิน ${MAX_SLIPS_PER_BILL} รูป ข้ามไป ${files.length - picked.length} รูป`
        : "";
    if (picked.length === 0) {
      showToast(`แนบสลิปได้สูงสุด ${MAX_SLIPS_PER_BILL} รูปต่อบิล`, "error");
      return;
    }

    setUploading(true);
    let next = slips;
    let lastError: unknown = null;
    for (const file of picked) {
      try {
        next = [...next, await addSlip(billId, file)];
        onChange(next);
      } catch (err) {
        lastError = err;
      }
    }
    setUploading(false);

    const added = next.length - slips.length;
    if (lastError) {
      showToast(
        added > 0
          ? `แนบสลิปแล้ว ${added} รูป ไม่สำเร็จ ${picked.length - added} รูป`
          : lastError instanceof Error
            ? lastError.message
            : "แนบสลิปไม่สำเร็จ",
        "error",
      );
    } else if (limitNote) {
      showToast(`แนบสลิปแล้ว ${added} รูป${limitNote}`, "error");
    } else {
      showToast(added > 1 ? `แนบสลิปแล้ว ${added} รูป` : "แนบสลิปแล้ว");
    }
  }

  async function handleRemove() {
    if (!confirmRemove) return;
    setRemoving(true);
    try {
      await deleteSlip(billId, confirmRemove.id);
      onChange(slips.filter((s) => s.id !== confirmRemove.id));
      setConfirmRemove(null);
      showToast("ลบสลิปแล้ว");
    } catch (err) {
      showToast(
        err instanceof Error ? err.message : "ลบสลิปไม่สำเร็จ",
        "error",
      );
    } finally {
      setRemoving(false);
    }
  }

  const fileInput = (
    <input
      type="file"
      accept="image/jpeg,image/png,image/webp"
      multiple
      disabled={uploading}
      onChange={(e) => {
        handleFiles(e.target.files);
        e.target.value = "";
      }}
      className="hidden"
    />
  );

  return (
    <>
      {slips.length > 0 ? (
        <div className="mk-card p-3">
          <div className="flex items-baseline justify-between gap-2 px-0.5">
            <span className="text-[15px] font-semibold">
              สลิปโอนเงิน{" "}
              <span className="mk-caption">
                {slips.length}/{MAX_SLIPS_PER_BILL} รูป
              </span>
            </span>
            {slipUploadedAt && (
              <span className="mk-caption">
                แนบล่าสุด {formatDateShort(slipUploadedAt)} ·{" "}
                {new Date(slipUploadedAt).toLocaleTimeString("th-TH", {
                  hour: "2-digit",
                  minute: "2-digit",
                })}{" "}
                น.
              </span>
            )}
          </div>
          <div className="mt-2.5 grid grid-cols-3 gap-2">
            {slips.map((slip, i) => (
              <div
                key={slip.id || slip.url}
                className="relative aspect-[3/4] overflow-hidden rounded-[10px] border border-line bg-sunken"
              >
                {/* The whole tile opens the slip — no need to hunt for a menu. */}
                <button
                  type="button"
                  onClick={() => setLightboxIndex(i)}
                  aria-label={`ดูสลิปรูปที่ ${i + 1} เต็มจอ`}
                  className="block h-full w-full cursor-zoom-in"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element -- slip served by the API gateway */}
                  <img
                    src={slip.url}
                    alt=""
                    className="h-full w-full object-cover object-top"
                  />
                  <span className="absolute bottom-1 left-1 grid h-6 w-6 place-items-center rounded-md bg-ink/70 text-white">
                    <Maximize size={13} strokeWidth={2.4} />
                  </span>
                </button>
                {/* id 0 = a slip from an older backend that can't be
                    removed individually. */}
                {slip.id > 0 && (
                  <button
                    type="button"
                    aria-label={`ลบสลิปรูปที่ ${i + 1}`}
                    onClick={() => setConfirmRemove(slip)}
                    className="absolute top-1 right-1 grid h-8 w-8 place-items-center rounded-lg bg-white/90 text-error shadow-card"
                  >
                    <Trash2 size={16} />
                  </button>
                )}
              </div>
            ))}
            {uploading ? (
              <div className="mk-upload is-busy aspect-[3/4] min-h-0!">
                <span className="mk-spin text-sand-700" />
                <small>กำลังอัปโหลด…</small>
              </div>
            ) : (
              room > 0 && (
                <label className="mk-upload aspect-[3/4] min-h-0! cursor-pointer">
                  <Plus />
                  <small>เพิ่มสลิป</small>
                  {fileInput}
                </label>
              )
            )}
          </div>
        </div>
      ) : uploading ? (
        <div className="mk-card p-3.5">
          <div className="mk-upload is-busy min-h-[72px]!">
            <span className="mk-spin text-sand-700" />
            กำลังอัปโหลด…
          </div>
        </div>
      ) : (
        <div className="mk-card border-[#f3dfa8]! bg-warning-100! p-3.5">
          <div className="flex items-start gap-2.5 text-[14px] leading-5 text-warning-700">
            <TriangleAlert size={18} className="mt-px flex-none" />
            <div>
              <b>ยังไม่มีสลิปโอนเงิน</b>
              <div className="text-[12px]">
                แนบตอนนี้เพื่อให้ใบเสร็จมีหลักฐานการชำระเงิน (สูงสุด{" "}
                {MAX_SLIPS_PER_BILL} รูป)
              </div>
            </div>
          </div>
          <label className="mk-btn mk-btn--primary mk-btn--block mt-3 cursor-pointer">
            <Upload />
            แนบสลิป
            {fileInput}
          </label>
        </div>
      )}

      {shown != null && (
        <OverlayPortal>
          <div
            className="mk mk-lightbox"
            role="dialog"
            aria-modal="true"
            aria-label="สลิป"
            onClick={() => setLightboxIndex(null)}
          >
            <div className="mk-lightbox__bar">
              <span>
                สลิป · {receiptNo}
                {slips.length > 1 && ` · ${shown + 1}/${slips.length}`}
              </span>
              <button
                type="button"
                aria-label="ปิด"
                onClick={() => setLightboxIndex(null)}
              >
                <X size={20} />
              </button>
            </div>
            <div className="mk-lightbox__img relative">
              {/* eslint-disable-next-line @next/next/no-img-element -- slip served by the API gateway */}
              <img src={slips[shown].url} alt="สลิปเต็มจอ" />
              {slips.length > 1 && (
                <>
                  <button
                    type="button"
                    aria-label="สลิปก่อนหน้า"
                    onClick={(e) => {
                      e.stopPropagation();
                      step(-1);
                    }}
                    className="absolute top-1/2 left-2 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full bg-white/15 text-white"
                  >
                    <ChevronLeft size={24} />
                  </button>
                  <button
                    type="button"
                    aria-label="สลิปถัดไป"
                    onClick={(e) => {
                      e.stopPropagation();
                      step(1);
                    }}
                    className="absolute top-1/2 right-2 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full bg-white/15 text-white"
                  >
                    <ChevronRight size={24} />
                  </button>
                </>
              )}
            </div>
          </div>
        </OverlayPortal>
      )}

      <ConfirmDelete
        open={confirmRemove != null}
        title="ลบสลิปนี้?"
        body="ต้องแนบใหม่ภายหลังถ้าต้องการ"
        confirmLabel="ลบสลิป"
        busy={removing}
        onConfirm={handleRemove}
        onCancel={() => setConfirmRemove(null)}
      />
    </>
  );
}
