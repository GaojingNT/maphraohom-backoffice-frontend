"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { Trash2, TriangleAlert } from "lucide-react";
import OverlayPortal from "@/components/overlay-portal";

// Shared shell for every bottom sheet and dialog (spec F13): 55% scrim,
// closes on scrim tap / Esc / swipe-down (sheets), locks page scroll,
// focuses the first control and hands focus back on close.
function useOverlayBehaviour(
  open: boolean,
  onClose: () => void,
  panelRef: React.RefObject<HTMLElement | null>,
) {
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  });

  useEffect(() => {
    if (!open) return;
    const previouslyFocused = document.activeElement as HTMLElement | null;
    const first = panelRef.current?.querySelector<HTMLElement>(
      "[data-autofocus], button:not([disabled]), input, select, textarea, a[href]",
    );
    first?.focus();
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onCloseRef.current();
    }
    document.addEventListener("keydown", onKeyDown);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = prevOverflow;
      previouslyFocused?.focus?.();
    };
  }, [open, panelRef]);
}

export function Sheet({
  open,
  onClose,
  label,
  children,
}: {
  open: boolean;
  onClose: () => void;
  /** Accessible name of the sheet. */
  label: string;
  children: ReactNode;
}) {
  const panelRef = useRef<HTMLDivElement>(null);
  const touchStartY = useRef<number | null>(null);
  useOverlayBehaviour(open, onClose, panelRef);
  if (!open) return null;

  return (
    <OverlayPortal>
      <div className="mk fixed inset-0 z-[70]">
        <div className="mk-scrim" onClick={onClose} />
        <div className="pointer-events-none absolute inset-y-0 left-1/2 z-[51] w-full max-w-[430px] -translate-x-1/2">
          <div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-label={label}
            className="mk-sheet pointer-events-auto"
            onTouchStart={(e) => {
              touchStartY.current = e.touches[0].clientY;
            }}
            onTouchEnd={(e) => {
              if (touchStartY.current == null) return;
              const delta = e.changedTouches[0].clientY - touchStartY.current;
              touchStartY.current = null;
              if (delta > 60) onClose(); // swipe down
            }}
          >
            <div className="mk-sheet__grab" />
            {children}
          </div>
        </div>
      </div>
    </OverlayPortal>
  );
}

// Centered dialog. Busy dialogs ignore scrim taps / Esc so a delete in
// flight can't be dismissed half-way.
export function Dialog({
  open,
  onClose,
  label,
  busy = false,
  role = "alertdialog",
  children,
}: {
  open: boolean;
  onClose: () => void;
  label: string;
  busy?: boolean;
  role?: "dialog" | "alertdialog";
  children: ReactNode;
}) {
  const panelRef = useRef<HTMLDivElement>(null);
  const close = () => {
    if (!busy) onClose();
  };
  useOverlayBehaviour(open, close, panelRef);
  if (!open) return null;

  return (
    <OverlayPortal>
      <div className="mk fixed inset-0 z-[70]">
        <div className="mk-scrim" onClick={close} />
        <div className="pointer-events-none absolute inset-y-0 left-1/2 z-[51] w-full max-w-[430px] -translate-x-1/2">
          <div
            ref={panelRef}
            role={role}
            aria-modal="true"
            aria-label={label}
            className="mk-dialog pointer-events-auto max-h-[92dvh] overflow-y-auto"
          >
            {children}
          </div>
        </div>
      </div>
    </OverlayPortal>
  );
}

// "ลบ…?" confirm — every destructive action goes through this (spec §7).
export function ConfirmDelete({
  open,
  title,
  body,
  confirmLabel,
  busy,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  body: ReactNode;
  confirmLabel: string;
  busy: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <Dialog open={open} onClose={onCancel} label={title} busy={busy}>
      <div className="mk-dialog__ic">
        <Trash2 size={22} />
      </div>
      <h2 className="mk-h2">{title}</h2>
      <p className="mt-1 text-[14px] text-ink-muted">{body}</p>
      <div className="mk-actions">
        <button
          type="button"
          className="mk-btn mk-btn--outline"
          disabled={busy}
          onClick={onCancel}
        >
          ยกเลิก
        </button>
        <button
          type="button"
          className="mk-btn mk-btn--danger"
          disabled={busy}
          onClick={onConfirm}
        >
          {busy && <span className="mk-spin" />}
          {busy ? "กำลังลบ…" : confirmLabel}
        </button>
      </div>
    </Dialog>
  );
}

// Leave-without-saving confirm, as a sheet with a warning icon.
export function ConfirmLeave({
  open,
  title,
  body,
  stayLabel,
  leaveLabel,
  onStay,
  onLeave,
}: {
  open: boolean;
  title: string;
  body: string;
  stayLabel: string;
  leaveLabel: string;
  onStay: () => void;
  onLeave: () => void;
}) {
  return (
    <Sheet open={open} onClose={onStay} label={title}>
      <div className="mk-dialog__ic">
        <TriangleAlert size={22} />
      </div>
      <h2 className="mk-h2">{title}</h2>
      <p className="mt-1 text-[14px] text-ink-muted">{body}</p>
      <div className="mk-actions">
        <button
          type="button"
          className="mk-btn mk-btn--outline mk-btn--lg"
          onClick={onStay}
        >
          {stayLabel}
        </button>
        <button
          type="button"
          className="mk-btn mk-btn--danger mk-btn--lg"
          onClick={onLeave}
        >
          {leaveLabel}
        </button>
      </div>
    </Sheet>
  );
}
