import type { BillItem } from "@/lib/types";
import { toNumber } from "@/lib/money";

export function formatBaht(amount: string | number): string {
  return "฿" + Math.round(toNumber(amount)).toLocaleString("en-US");
}

export function formatQuantity(quantity: string | number, unit: string): string {
  return (
    toNumber(quantity).toLocaleString("en-US", { maximumFractionDigits: 3 }) +
    " " +
    unit
  );
}

export function formatDateShort(iso: string): string {
  return new Date(iso).toLocaleDateString("th-TH", {
    day: "numeric",
    month: "short",
  });
}

export function formatDateFull(iso: string): string {
  const d = new Date(iso);
  return (
    d.toLocaleDateString("th-TH", {
      day: "2-digit",
      month: "short",
      year: "2-digit",
    }) +
    " · " +
    d.toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" }) +
    " น."
  );
}

// Quantity summed per unit, e.g. "20.5 กก. · 10 ขวด" — กก. and ขวด can
// never be added together, so this groups by unit instead of the old
// cross-unit sumKg().
export function formatQuantityByUnit(items: BillItem[]): string {
  const byUnit = new Map<string, number>();
  for (const item of items) {
    byUnit.set(item.unit, (byUnit.get(item.unit) ?? 0) + toNumber(item.quantity));
  }
  return [...byUnit.entries()]
    .map(([unit, qty]) => formatQuantity(qty, unit))
    .join(" · ");
}

// Full-word unit label for a product's selling unit, used next to the
// quantity input/display — "กก." reads as "กิโลกรัม" there, "ขวด" stays as-is.
export function unitLabel(unit: string): string {
  return unit === "กก." ? "กิโลกรัม" : unit;
}

// Field labels for the create/edit form's quantity and price inputs, which
// change wording by unit (spec: "น้ำหนัก (กก.)"/"จำนวน (ขวด)", "ราคา/กก."/"ราคา/ขวด").
export function quantityFieldLabel(unit: string): string {
  return unit === "ขวด" ? `จำนวน (${unit})` : `น้ำหนัก (${unit})`;
}

export function priceFieldLabel(unit: string): string {
  return `ราคา/${unit}`;
}
