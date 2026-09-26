"use client";

import { useEffect, useState } from "react";
import {
  Maximize,
  RefreshCw,
  Trash2,
  TriangleAlert,
  Upload,
  X,
} from "lucide-react";
import { deleteSlip, uploadSlip } from "@/lib/api/bills";
import { formatDateShort } from "@/lib/format";
import { useToast } from "@/components/toast-provider";
import OverlayPortal from "@/components/overlay-portal";
import { ConfirmDelete } from "@/components/ui/overlay";

// Attach/change/remove a bill's slip — talks directly to the dedicated
// PUT/DELETE /bills/:id/slip endpoints (slips are managed independently of
// the bill's own fields, so this never touches the rest of the bill).
export default function SlipPanel({
  billId,
  receiptNo,
  slipUrl,
  slipUploadedAt,
  lightboxRequest = 0,
  onChange,
}: {
  billId: number;
  receiptNo: number;
  slipUrl: string | null;
  slipUploadedAt: string | null;
  /** Bumped by the parent (the ⋯ menu) to open the full-screen view. */
  lightboxRequest?: number;
  onChange: (slipUrl: string | null) => void;
}) {
  const { showToast } = useToast();
  const [uploading, setUploading] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [confirmRemoveOpen, setConfirmRemoveOpen] = useState(false);
  const [seenRequest, setSeenRequest] = useState(lightboxRequest);

  // Open when the parent asks (adjusting state while rendering, the
  // React-recommended way to respond to a prop change).
  if (lightboxRequest !== seenRequest) {
    setSeenRequest(lightboxRequest);
    if (slipUrl) setLightboxOpen(true);
  }

  useEffect(() => {
    if (!lightboxOpen) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setLightboxOpen(false);
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [lightboxOpen]);

  async function handleFile(file: File | null) {
    if (!file) return;
    setUploading(true);
    try {
      const url = await uploadSlip(billId, file);
      onChange(url);
      showToast(slipUrl ? "เปลี่ยนสลิปแล้ว" : "แนบสลิปแล้ว");
    } catch (err) {
      showToast(
        err instanceof Error ? err.message : "แนบสลิปไม่สำเร็จ",
        "error",
      );
    } finally {
      setUploading(false);
    }
  }

  async function handleRemove() {
    setRemoving(true);
    try {
      await deleteSlip(billId);
      onChange(null);
      setConfirmRemoveOpen(false);
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
      disabled={uploading}
      onChange={(e) => {
        handleFile(e.target.files?.[0] ?? null);
        e.target.value = "";
      }}
      className="hidden"
    />
  );

  return (
    <>
      {uploading ? (
        <div className="mk-card p-3.5">
          <div className="mk-upload is-busy min-h-[72px]!">
            <span className="mk-spin text-sand-700" />
            กำลังอัปโหลด…
          </div>
        </div>
      ) : slipUrl ? (
        <div className="mk-card flex items-center gap-3 p-2.5">
          {/* The whole block opens the slip — no need to hunt for a menu. */}
          <button
            type="button"
            onClick={() => setLightboxOpen(true)}
            aria-label="ดูสลิปเต็มจอ"
            className="flex min-w-0 flex-1 cursor-zoom-in items-center gap-3 text-left"
          >
            <span className="relative h-[72px] w-14 flex-none overflow-hidden rounded-[10px] border border-line bg-sunken">
              {/* eslint-disable-next-line @next/next/no-img-element -- slip served by the API gateway */}
              <img
                src={slipUrl}
                alt=""
                className="h-full w-full object-cover object-top"
              />
              <span className="absolute right-[3px] bottom-[3px] grid h-5 w-5 place-items-center rounded-md bg-ink/70 text-white">
                <Maximize size={12} strokeWidth={2.4} />
              </span>
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-[15px] font-semibold">
                สลิปโอนเงิน
              </span>
              {slipUploadedAt && (
                <span className="mk-caption block">
                  แนบเมื่อ {formatDateShort(slipUploadedAt)} ·{" "}
                  {new Date(slipUploadedAt).toLocaleTimeString("th-TH", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}{" "}
                  น.
                </span>
              )}
              <span className="block text-[12px] font-semibold text-ocean-700">
                แตะเพื่อดูเต็มจอ
              </span>
            </span>
          </button>
          <label
            className="mk-iconbtn cursor-pointer"
            aria-label="เปลี่ยนสลิป"
            title="เปลี่ยนสลิป"
          >
            <RefreshCw size={18} />
            {fileInput}
          </label>
          <button
            type="button"
            aria-label="ลบสลิป"
            onClick={() => setConfirmRemoveOpen(true)}
            className="mk-iconbtn mk-iconbtn--danger"
          >
            <Trash2 size={18} />
          </button>
        </div>
      ) : (
        <div className="mk-card border-[#f3dfa8]! bg-warning-100! p-3.5">
          <div className="flex items-start gap-2.5 text-[14px] leading-5 text-warning-700">
            <TriangleAlert size={18} className="mt-px flex-none" />
            <div>
              <b>ยังไม่มีสลิปโอนเงิน</b>
              <div className="text-[12px]">
                แนบตอนนี้เพื่อให้ใบเสร็จมีหลักฐานการชำระเงิน
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

      {lightboxOpen && slipUrl && (
        <OverlayPortal>
          <div
            className="mk mk-lightbox"
            role="dialog"
            aria-modal="true"
            aria-label="สลิป"
            onClick={() => setLightboxOpen(false)}
          >
            <div className="mk-lightbox__bar">
              <span>สลิป · {receiptNo}</span>
              <button
                type="button"
                aria-label="ปิด"
                onClick={() => setLightboxOpen(false)}
              >
                <X size={20} />
              </button>
            </div>
            <div className="mk-lightbox__img">
              {/* eslint-disable-next-line @next/next/no-img-element -- slip served by the API gateway */}
              <img src={slipUrl} alt="สลิปเต็มจอ" />
            </div>
          </div>
        </OverlayPortal>
      )}

      <ConfirmDelete
        open={confirmRemoveOpen}
        title="ลบสลิปนี้?"
        body="ต้องแนบใหม่ภายหลังถ้าต้องการ"
        confirmLabel="ลบสลิป"
        busy={removing}
        onConfirm={handleRemove}
        onCancel={() => setConfirmRemoveOpen(false)}
      />
    </>
  );
}
