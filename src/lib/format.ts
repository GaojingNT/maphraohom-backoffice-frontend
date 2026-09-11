import type { Bill } from "@/lib/types";

export function formatBaht(amount: number): string {
  return "฿" + Math.round(amount).toLocaleString("en-US");
}

export function formatKg(kilogram: number): string {
  return (
    kilogram.toLocaleString("en-US", { maximumFractionDigits: 1 }) + " กก."
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

export function sumKg(bill: Bill): number {
  return bill.items.reduce((total, item) => total + item.quantity, 0);
}

// Full-word unit label for a product's selling unit, used next to the
// quantity input/display — "กก." reads as "กิโลกรัม" there, "ขวด" stays as-is.
export function unitLabel(unit: string): string {
  return unit === "กก." ? "กิโลกรัม" : unit;
}
