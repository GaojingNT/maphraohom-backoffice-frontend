"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown, Plus } from "lucide-react";
import {
  normalizeProductName,
  type ProductListItem,
} from "@/lib/api/products";

// One row of the open list: a product, or the "add as new item" row.
type Option =
  | { kind: "product"; product: ProductListItem }
  | { kind: "new"; name: string };

// Item name for payment bills — a dropdown you can also type into. Focusing
// it (or the ▾ button) opens every product, grouped into items typed on
// earlier payment bills and the coconut catalog; typing filters the list.
// A name with no exact match offers "+ เพิ่ม … เป็นรายการใหม่", but the
// form treats any unmatched name as a new item even without picking that
// row. `text` is what's in the box; onType fires for every edit, onPick
// when a product is chosen. ↑/↓ move, Enter picks, Esc closes.
export default function ProductCombobox({
  id,
  text,
  selectedId,
  products,
  onType,
  onPick,
}: {
  id: string;
  text: string;
  selectedId: number | null;
  products: ProductListItem[];
  onType: (text: string) => void;
  onPick: (product: ProductListItem) => void;
}) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const blurTimer = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  );
  useEffect(() => () => clearTimeout(blurTimer.current), []);

  // A picked product shows its full name, so list everything rather than
  // filtering down to just itself.
  const name = normalizeProductName(text);
  const query = selectedId != null ? "" : name.toLowerCase();
  const matches = query
    ? products.filter((p) => p.name.toLowerCase().includes(query))
    : products;
  const paymentItems = matches.filter((p) => p.billScope === "payment");
  const catalog = matches.filter((p) => p.billScope !== "payment");
  const exact = products.some((p) => p.name.toLowerCase() === query);

  const options: Option[] = [
    ...paymentItems.map((product) => ({ kind: "product" as const, product })),
    ...catalog.map((product) => ({ kind: "product" as const, product })),
    ...(query && !exact ? [{ kind: "new" as const, name }] : []),
  ];

  // Keep the keyboard-highlighted row in view.
  useEffect(() => {
    if (!open || active < 0) return;
    listRef.current
      ?.querySelector<HTMLElement>(`[data-index="${active}"]`)
      ?.scrollIntoView({ block: "nearest" });
  }, [open, active]);

  function choose(option: Option) {
    if (option.kind === "product") onPick(option.product);
    else onType(option.name);
    setOpen(false);
    setActive(-1);
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      if (!open) {
        setOpen(true);
        return;
      }
      if (options.length === 0) return;
      const step = e.key === "ArrowDown" ? 1 : -1;
      setActive((i) => (i + step + options.length) % options.length);
    } else if (e.key === "Enter" && open && active >= 0 && options[active]) {
      e.preventDefault();
      choose(options[active]);
    } else if (e.key === "Escape" && open) {
      e.preventDefault();
      setOpen(false);
      setActive(-1);
    }
  }

  const listId = `${id}-list`;
  const optionId = (i: number) => `${id}-opt-${i}`;

  function renderOption(option: Option, index: number) {
    const key =
      option.kind === "product" ? `p${option.product.id}` : "new-item-row";
    const common = {
      id: optionId(index),
      "data-index": index,
      type: "button" as const,
      role: "option",
      "aria-selected": index === active,
      className: index === active ? "is-hl" : undefined,
      // mousedown, not click: fires before the input's blur closes the list.
      onMouseDown: (e: React.MouseEvent) => {
        e.preventDefault();
        choose(option);
      },
      onMouseEnter: () => setActive(index),
    };
    if (option.kind === "new") {
      return (
        <button key={key} {...common}>
          <span className="mk-ac__new flex items-center gap-1.5">
            <Plus size={15} strokeWidth={2.6} />
            เพิ่ม “{option.name}” เป็นรายการใหม่
          </span>
        </button>
      );
    }
    const { product } = option;
    return (
      <button key={key} {...common}>
        <span className="flex items-baseline justify-between gap-3">
          <b className={product.id === selectedId ? "text-ocean-700" : ""}>
            {product.name}
          </b>
          <small className="flex-none">{product.unit}</small>
        </span>
      </button>
    );
  }

  const groupLabel = "mk-caption bg-sunken px-3.5 py-1.5 font-semibold";

  return (
    <div className="relative">
      <div className="relative">
        <input
          ref={inputRef}
          id={id}
          value={text}
          role="combobox"
          aria-expanded={open}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={
            open && active >= 0 ? optionId(active) : undefined
          }
          onChange={(e) => {
            onType(e.target.value);
            setOpen(true);
            setActive(-1);
          }}
          onFocus={() => setOpen(true)}
          onClick={() => setOpen(true)}
          onBlur={() => {
            blurTimer.current = setTimeout(() => {
              setOpen(false);
              setActive(-1);
            }, 120);
          }}
          onKeyDown={onKeyDown}
          placeholder="พิมพ์หรือเลือกรายการ"
          autoComplete="off"
          className="mk-input pr-11!"
        />
        <button
          type="button"
          tabIndex={-1}
          aria-label={open ? "ปิดรายการ" : "เปิดรายการทั้งหมด"}
          onMouseDown={(e) => {
            e.preventDefault();
            if (open) {
              setOpen(false);
            } else {
              inputRef.current?.focus();
              setOpen(true);
            }
          }}
          className="absolute inset-y-0 right-0 grid w-11 place-items-center text-ink-muted"
        >
          <ChevronDown
            size={18}
            className={`transition-transform ${open ? "rotate-180" : ""}`}
          />
        </button>
      </div>
      {open && options.length > 0 && (
        <div
          ref={listRef}
          id={listId}
          role="listbox"
          className="mk-ac max-h-[280px] overflow-y-auto!"
        >
          {paymentItems.length > 0 && (
            <div className={groupLabel}>รายการจ่ายที่เคยใช้</div>
          )}
          {options
            .slice(0, paymentItems.length)
            .map((o, i) => renderOption(o, i))}
          {catalog.length > 0 && (
            <div className={groupLabel}>สินค้ามะพร้าว</div>
          )}
          {options
            .slice(paymentItems.length)
            .map((o, i) => renderOption(o, paymentItems.length + i))}
        </div>
      )}
    </div>
  );
}
