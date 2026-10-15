"use client";

import { useState } from "react";
import { MAX_UNIT_LENGTH } from "@/lib/api/products";

const CUSTOM = "__custom__";

// Unit of a payment-bill item: a dropdown of known units plus
// "อื่นๆ (พิมพ์เอง)", which swaps in a text box for any other unit. A value
// that isn't in `options` (e.g. a unit typed on an earlier bill) opens in
// the text box.
export default function UnitPicker({
  id,
  value,
  options,
  onChange,
}: {
  id: string;
  value: string;
  options: string[];
  onChange: (unit: string) => void;
}) {
  const [custom, setCustom] = useState(() => !options.includes(value));
  // A product picked later may bring a known unit back — show it selected.
  // Only for changes from outside: typing "ลังใหญ่" passes through "ลัง",
  // which mustn't snap the box shut mid-word.
  const [seenValue, setSeenValue] = useState(value);
  const [typedValue, setTypedValue] = useState<string | null>(null);
  if (value !== seenValue) {
    setSeenValue(value);
    if (custom && value !== typedValue && options.includes(value)) {
      setCustom(false);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <select
        id={id}
        value={custom ? CUSTOM : value}
        onChange={(e) => {
          if (e.target.value === CUSTOM) {
            setCustom(true);
            onChange("");
          } else {
            setCustom(false);
            onChange(e.target.value);
          }
        }}
        className="mk-input"
      >
        {options.map((u) => (
          <option key={u} value={u}>
            {u}
          </option>
        ))}
        <option value={CUSTOM}>อื่นๆ (พิมพ์เอง)</option>
      </select>
      {custom && (
        <input
          aria-label="พิมพ์หน่วย"
          value={value}
          onChange={(e) => {
            setTypedValue(e.target.value);
            onChange(e.target.value);
          }}
          maxLength={MAX_UNIT_LENGTH}
          placeholder="พิมพ์หน่วย เช่น ลัง"
          autoComplete="off"
          autoFocus
          className="mk-input"
        />
      )}
    </div>
  );
}
