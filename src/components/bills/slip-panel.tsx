"use client";

import { useState } from "react";
import { Maximize, RefreshCw, Trash2, Upload, X } from "lucide-react";
import { deleteSlip, uploadSlip } from "@/lib/api/bills";
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
  onChange,
}: {
  billId: number;
  receiptNo: number;
  slipUrl: string | null;
  onChange: (slipUrl: string | null) => void;
}) {
  const { showToast } = useToast();
  const [uploading, setUploading] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [confirmRemoveOpen, setConfirmRemoveOpen] = useState(false);

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
      <div className="mk-card mk-card__pad">
        <div className="mb-2.5 flex items-center justify-between">
          <h2 className="mk-title">สลิปโอนเงิน</h2>
          {slipUrl && !uploading && (
            <span className="mk-badge bg-receipt-100! text-receipt-600!">
              แนบแล้ว
            </span>
          )}
        </div>

        {uploading ? (
          <div className="mk-upload is-busy">
            <span className="mk-spin text-sand-700" />
            กำลังอัปโหลด…
          </div>
        ) : slipUrl ? (
          <>
            <button
              type="button"
              onClick={() => setLightboxOpen(true)}
              aria-label="ดูสลิปเต็มจอ"
              className="mk-slipview block h-[220px] w-full"
            >
              {/* eslint-disable-next-line @next/next/no-img-element -- slip served by the API gateway */}
              <img
                src={slipUrl}
                alt="สลิปโอนเงิน"
                className="h-full w-full object-cover object-top"
              />
              <span className="mk-slipview__hint">
                <Maximize size={14} />
                แตะเพื่อดูเต็มจอ
              </span>
            </button>
            <div className="mk-grid2 mt-2.5">
              <label className="mk-btn mk-btn--outline cursor-pointer">
                <RefreshCw />
                เปลี่ยนสลิป
                {fileInput}
              </label>
              <button
                type="button"
                onClick={() => setConfirmRemoveOpen(true)}
                className="mk-btn mk-btn--outline text-error!"
              >
                <Trash2 />
                ลบสลิป
              </button>
            </div>
          </>
        ) : (
          <label className="mk-upload">
            <Upload />
            แตะเพื่อแนบสลิป
            <small>JPG · PNG · WebP ไม่เกิน 10 MB</small>
            {fileInput}
          </label>
        )}
      </div>

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
