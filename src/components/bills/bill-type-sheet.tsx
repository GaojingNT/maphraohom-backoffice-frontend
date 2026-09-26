"use client";

import { ArrowDown, ArrowUp, ChevronRight } from "lucide-react";
import { BILL_TYPE_CONFIG, BILL_TYPES, type BillType } from "@/lib/bill-type";
import { Sheet } from "@/components/ui/overlay";

const ICONS: Record<BillType, typeof ArrowDown> = {
  receipt: ArrowDown, // money in
  payment: ArrowUp, // money out
};

// Bottom sheet for picking a bill type before creating a bill (S3).
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
}: {
  open: boolean;
  onClose: () => void;
  onSelect: (type: BillType) => void;
}) {
  return (
    <Sheet open={open} onClose={onClose} label="สร้างบิลใหม่">
      <h2 className="mk-h2">สร้างบิลใหม่</h2>
      <p className="mt-0.5 mb-4 text-[14px] text-ink-muted">
        เลือกประเภทบิลที่ต้องการออก
      </p>
      {BILL_TYPES.map((type) => {
        const config = BILL_TYPE_CONFIG[type];
        const Icon = ICONS[type];
        return (
          <button
            key={type}
            type="button"
            onClick={() => onSelect(type)}
            className={`mk-typecard ${config.theme}`}
          >
            <span className="mk-typecard__ic">
              <Icon strokeWidth={2.4} />
            </span>
            <span className="min-w-0 flex-1">
              <b>{config.title}</b>
              <small>{config.description}</small>
            </span>
            <ChevronRight className="mk-billrow__chev" />
          </button>
        );
      })}
      <button
        type="button"
        onClick={onClose}
        className="mk-btn mk-btn--outline mk-btn--block mk-btn--lg mt-4"
      >
        ยกเลิก
      </button>
    </Sheet>
  );
}
