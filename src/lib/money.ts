// Client-side money math for the create/edit form's live preview only — the
// backend recomputes and owns the authoritative subtotal/total. Naively
// summing floating-point baht (0.1 + 0.2 style drift) is avoided by doing
// every addition in integer สตางค์ (cents) and converting back to baht once
// at the end, rather than chaining float additions.

/** Parses a decimal string (or number) the way the API sends/accepts money
 * and quantity — returns 0 for empty/invalid input rather than NaN, since
 * the form always treats an unparsable field as "not filled in yet". */
export function toNumber(value: string | number | null | undefined): number {
  if (value == null || value === "") return 0;
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : 0;
}

/** Baht amount -> integer สตางค์, rounded once. */
function toCents(amount: number): number {
  return Math.round(amount * 100);
}

/** สตางค์ -> baht. */
function centsToBaht(cents: number): number {
  return cents / 100;
}

/** subtotal = round(quantity * price, 2) — mirrors the backend's formula.
 * price is converted to cents first so the single multiply+round happens in
 * integer space rather than compounding float error across many rows. */
export function computeSubtotalCents(
  quantity: string,
  price: string,
): number {
  const priceCents = toCents(toNumber(price));
  return Math.round(toNumber(quantity) * priceCents);
}

export function subtotalBaht(quantity: string, price: string): number {
  return centsToBaht(computeSubtotalCents(quantity, price));
}

/** total = sum(subtotal) - discount + shippingFee — every term added in
 * cents so the running sum never drifts. */
export function computeTotalCents(
  subtotalCentsList: number[],
  discount: string,
  shippingFee: string,
): number {
  const itemsCents = subtotalCentsList.reduce((a, c) => a + c, 0);
  const discountCents = toCents(toNumber(discount));
  const shippingCents = toCents(toNumber(shippingFee));
  return itemsCents - discountCents + shippingCents;
}

export function totalBaht(
  subtotalCentsList: number[],
  discount: string,
  shippingFee: string,
): number {
  return centsToBaht(computeTotalCents(subtotalCentsList, discount, shippingFee));
}
