"use client";

import { useEffect, useRef, useState } from "react";
import {
  normalizeProductName,
  type ProductListItem,
} from "@/lib/api/products";

const MAX_SUGGESTIONS = 8;

// Free-text item name for payment bills: suggests existing products as you
// type (any scope — coconut products can be paid for too), and anything
// else is a new item the backend saves for next time. `text` is what's in
// the box; onType fires for every edit, onPick when a suggestion is chosen.
export default function ProductCombobox({
  id,
  text,
  products,
  onType,
  onPick,
}: {
  id: string;
  text: string;
  products: ProductListItem[];
  onType: (text: string) => void;
  onPick: (product: ProductListItem) => void;
}) {
  const [open, setOpen] = useState(false);
  const blurTimer = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  );
  useEffect(() => () => clearTimeout(blurTimer.current), []);

  const query = normalizeProductName(text).toLowerCase();
  const suggestions = query
    ? products
        .filter((p) => p.name.toLowerCase().includes(query))
        .slice(0, MAX_SUGGESTIONS)
    : [];
  const exact = suggestions.some((p) => p.name.toLowerCase() === query);

  return (
    <div className="relative">
      <input
        id={id}
        value={text}
        onChange={(e) => {
          onType(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => {
          blurTimer.current = setTimeout(() => setOpen(false), 120);
        }}
        placeholder="พิมพ์ชื่อรายการ เช่น ค่าขนส่ง"
        autoComplete="off"
        className="mk-input"
      />
      {open && suggestions.length > 0 && !exact && (
        <div className="mk-ac">
          {suggestions.map((p) => (
            <button
              key={p.id}
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                onPick(p);
                setOpen(false);
              }}
            >
              <b>{p.name}</b>
              <small>{p.unit}</small>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
