"use client";

import { useState } from "react";
import { CloudCheck, ImagePlus, RefreshCw, Trash2 } from "lucide-react";
import { useToast } from "@/components/toast-provider";
import { ConfirmDelete } from "@/components/ui/overlay";

// Generic attach/change/remove panel for a single image field (store logo,
// user signature). Uploads and deletes save immediately — the panel says so
// and sits in its own card, apart from the form's Save (spec §7 #12).
export default function ImageUploadPanel({
  label,
  imageUrl,
  onUpload,
  onDelete,
  onChange,
  emptyLabel = "แตะเพื่ออัปโหลด",
  deleteBody = "ต้องอัปโหลดใหม่ภายหลังถ้าต้องการ",
  helper,
  variant = "wide",
}: {
  label: string;
  imageUrl: string | null;
  onUpload: (file: File) => Promise<string>;
  onDelete: () => Promise<void>;
  onChange: (url: string | null) => void;
  emptyLabel?: string;
  deleteBody?: string;
  helper?: string;
  /** "wide" for a signature strip, "square" for a logo tile. */
  variant?: "wide" | "square";
}) {
  const { showToast } = useToast();
  const [uploading, setUploading] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [confirmRemoveOpen, setConfirmRemoveOpen] = useState(false);

  async function handleFile(file: File | null) {
    if (!file) return;
    setUploading(true);
    try {
      const url = await onUpload(file);
      onChange(url);
      showToast(imageUrl ? `เปลี่ยน${label}แล้ว` : `อัปโหลด${label}แล้ว`);
    } catch (err) {
      showToast(
        err instanceof Error ? err.message : `อัปโหลด${label}ไม่สำเร็จ`,
        "error",
      );
    } finally {
      setUploading(false);
    }
  }

  async function handleRemove() {
    setRemoving(true);
    try {
      await onDelete();
      onChange(null);
      setConfirmRemoveOpen(false);
      showToast(`ลบ${label}แล้ว`);
    } catch (err) {
      showToast(
        err instanceof Error ? err.message : `ลบ${label}ไม่สำเร็จ`,
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

  const actions = (
    <>
      <label className="mk-btn mk-btn--outline cursor-pointer">
        <RefreshCw />
        เปลี่ยนรูป
        {fileInput}
      </label>
      <button
        type="button"
        onClick={() => setConfirmRemoveOpen(true)}
        className="mk-btn mk-btn--outline text-error!"
      >
        <Trash2 />
        ลบรูป
      </button>
    </>
  );

  return (
    <>
      <div className="mk-card mk-card__pad">
        <h2 className="mk-title mb-2">{label}</h2>
        <div className="mk-alert mk-alert--auto mb-2.5">
          <CloudCheck />
          บันทึกอัตโนมัติ — อัปโหลดหรือลบแล้วมีผลทันที ไม่ต้องกดบันทึก
        </div>

        {uploading ? (
          <div className="mk-upload is-busy">
            <span className="mk-spin text-sand-700" />
            กำลังอัปโหลด…
          </div>
        ) : imageUrl ? (
          variant === "square" ? (
            <div className="flex items-center gap-3">
              <span className="mk-logotile h-[72px]! w-[72px]! rounded-[18px]!">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={imageUrl} alt={label} />
              </span>
              <div className="flex min-w-0 flex-1 flex-col gap-2">
                {actions}
              </div>
            </div>
          ) : (
            <>
              <div className="mk-sig">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={imageUrl} alt={label} />
              </div>
              <div className="mk-grid2 mt-2.5">{actions}</div>
            </>
          )
        ) : (
          <label className="mk-upload">
            <ImagePlus />
            {emptyLabel}
            <small>JPG · PNG · WebP ไม่เกิน 10 MB</small>
            {fileInput}
          </label>
        )}

        {helper && <div className="mk-help">{helper}</div>}
      </div>

      <ConfirmDelete
        open={confirmRemoveOpen}
        title={`ลบ${label}นี้?`}
        body={deleteBody}
        confirmLabel="ลบรูป"
        busy={removing}
        onConfirm={handleRemove}
        onCancel={() => setConfirmRemoveOpen(false)}
      />
    </>
  );
}
