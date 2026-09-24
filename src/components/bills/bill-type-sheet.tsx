"use client";

import { useEffect, useRef } from "react";
import { ArrowDownCircle, ArrowUpCircle } from "lucide-react";
import { BILL_TYPE_CONFIG, BILL_TYPES, type BillType } from "@/lib/bill-type";

const ICONS: Record<BillType, typeof ArrowDownCircle> = {
  receipt: ArrowDownCircle,
  payment: ArrowUpCircle,
};

// Reusable bottom sheet for picking a bill type before creating a bill.
// Two call sites use it, each owning its own open state:
//   - BottomNav: its "สร้างบิล" tab opens this instead of navigating
//     directly; onClose just closes it (user stays on the current page).
//   - /create's guard: forced open when ?type= is missing/invalid;
//     onClose there routes home instead, since /create has nothing to show
//     without a valid type.
export default function BillTypeSheet({
  open,
  onClose,
  onSelect,
  returnFocusRef,
}: {
  open: boolean;
  onClose: () => void;
  onSelect: (type: BillType) => void;
  returnFocusRef?: React.RefObject<HTMLElement | null>;
}) {
  const firstCardRef = useRef<HTMLButtonElement>(null);
  const touchStartY = useRef<number | null>(null);

  useEffect(() => {
    if (!open) return;
    firstCardRef.current?.focus();
    const elementToRefocus = returnFocusRef?.current;

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      elementToRefocus?.focus();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- onClose/returnFocusRef are stable from the caller
  }, [open]);

  if (!open) return null;

  return (
    <div
      role="presentation"
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-end justify-center bg-[rgba(10,16,12,0.55)] [animation:fadeIn_0.16s_ease_both]"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="bill-type-sheet-title"
        onClick={(e) => e.stopPropagation()}
        onTouchStart={(e) => {
          touchStartY.current = e.touches[0].clientY;
        }}
        onTouchEnd={(e) => {
          if (touchStartY.current == null) return;
          const delta = e.changedTouches[0].clientY - touchStartY.current;
          touchStartY.current = null;
          if (delta > 60) onClose(); // swipe down
        }}
        className="w-full max-w-[430px] border-t-2 border-divider bg-surface px-5 pt-6 pb-[calc(env(safe-area-inset-bottom)+20px)] [animation:riseIn_0.2s_ease_both]"
      >
        <h2
          id="bill-type-sheet-title"
          className="text-[20px] leading-[1.3] font-bold"
        >
          สร้างบิลใหม่
        </h2>
        <p className="mt-1.5 mb-5 text-[13px] leading-[1.5] text-ink/55">
          เลือกประเภทบิลที่ต้องการออก
        </p>

        <div className="flex flex-col gap-3">
          {BILL_TYPES.map((type, i) => {
            const config = BILL_TYPE_CONFIG[type];
            const Icon = ICONS[type];
            return (
              <button
                key={type}
                ref={i === 0 ? firstCardRef : undefined}
                type="button"
                onClick={() => onSelect(type)}
                className={`flex min-h-[68px] items-center gap-3.5 border px-4 py-3.5 text-left ${config.color.border} ${config.color.bgSoft}`}
              >
                <Icon size={26} strokeWidth={1.7} className={config.color.text} />
                <div className="min-w-0 flex-1">
                  <div className={`text-[16px] font-bold ${config.color.text}`}>
                    {config.title}
                  </div>
                  <div className="mt-0.5 text-[12px] leading-[1.4] text-ink/60">
                    {config.description}
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        <button
          type="button"
          onClick={onClose}
          className="mt-4 min-h-[50px] w-full border border-divider bg-transparent text-[14px] font-semibold"
        >
          ยกเลิก
        </button>
      </div>
    </div>
  );
}
