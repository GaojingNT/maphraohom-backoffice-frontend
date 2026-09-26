"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ChevronLeft,
  CircleAlert,
  Plus,
  RefreshCw,
  Trash2,
  TriangleAlert,
  Upload,
} from "lucide-react";
import {
  ApiError,
  createBill,
  updateBill,
  uploadSlip,
  type BillItemInput,
} from "@/lib/api/bills";
import {
  getCustomerAddresses,
  getCustomerPhones,
  searchCustomers,
  type CustomerAddressItem,
  type CustomerListItem,
  type CustomerPhoneItem,
} from "@/lib/api/customers";
import type { ProductListItem } from "@/lib/api/products";
import { getLastPrices } from "@/lib/api/stores";
import {
  formatBaht,
  formatQuantity,
  priceFieldLabel,
  quantityFieldLabel,
  toDatetimeLocalValue,
} from "@/lib/format";
import { subtotalBaht, toNumber, totalBaht } from "@/lib/money";
import { useToast } from "@/components/toast-provider";
import { BILL_TYPE_CONFIG, type BillType } from "@/lib/bill-type";
import type { Bill, Store } from "@/lib/types";
import { ConfirmLeave } from "@/components/ui/overlay";

const BOTTLE_UNIT = "ขวด";

interface FormItem {
  key: string;
  productId: number | null;
  quantity: string;
  price: string;
}

interface FormErrors {
  storeId?: string;
  customerName?: string;
  customerAddress?: string;
  customerId?: string;
  discount?: string;
  shippingFee?: string;
  itemsList?: string;
  items: Record<
    string,
    { quantity?: string; price?: string; productId?: string }
  >;
}

function sanitizeNumberInput(raw: string): string {
  return raw.replace(/[^0-9.]/g, "");
}

function emptyErrors(): FormErrors {
  return { items: {} };
}

function hasErrors(errors: FormErrors): boolean {
  return (
    !!errors.storeId ||
    !!errors.customerName ||
    !!errors.customerAddress ||
    !!errors.customerId ||
    !!errors.discount ||
    !!errors.shippingFee ||
    !!errors.itemsList ||
    Object.keys(errors.items).length > 0
  );
}

let itemKeySeq = 0;
function createFormItem(): FormItem {
  return { key: `i${itemKeySeq++}`, productId: null, quantity: "", price: "" };
}

// Maps the backend's "items[N].field" validation errors back onto the form
// row at that same array position — POST/PUT always sends items in this
// exact order, so the index lines up.
function applyServerFieldErrors(
  fieldErrors: { field: string; tag: string }[],
  items: FormItem[],
): FormErrors {
  const next = emptyErrors();
  for (const err of fieldErrors) {
    const itemMatch = /^items\[(\d+)]\.(\w+)$/.exec(err.field);
    if (itemMatch) {
      const idx = Number(itemMatch[1]);
      const item = items[idx];
      if (!item) continue;
      next.items[item.key] = {
        ...next.items[item.key],
        [itemMatch[2]]: "ค่านี้ไม่ถูกต้อง",
      };
      continue;
    }
    if (err.field === "items") {
      next.itemsList = "ต้องมีสินค้าอย่างน้อย 1 รายการ";
    } else if (err.field === "discount") {
      next.discount = "ส่วนลดต้องไม่ติดลบ";
    } else if (err.field === "shippingFee") {
      next.shippingFee = "ค่าส่งต้องไม่ติดลบ";
    } else if (err.field === "customerId") {
      next.customerId = "ไม่พบลูกค้ารายนี้";
    }
  }
  return next;
}

// Scroll to and focus the first field that failed (spec §7 #4).
function focusFirstError() {
  requestAnimationFrame(() => {
    const field = document.querySelector<HTMLElement>(".has-error");
    if (!field) return;
    field.scrollIntoView({ block: "center", behavior: "smooth" });
    field
      .querySelector<HTMLElement>("input, select, textarea")
      ?.focus({ preventScroll: true });
  });
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <div className="mk-err">
      <CircleAlert />
      {message}
    </div>
  );
}

export default function BillFormView({
  type,
  stores,
  products,
  editingBill,
}: {
  type: BillType;
  stores: Store[];
  products: ProductListItem[];
  editingBill?: Bill;
}) {
  const router = useRouter();
  const { showToast } = useToast();
  const isEditing = !!editingBill;
  const config = BILL_TYPE_CONFIG[type];

  const productById = new Map(products.map((p) => [p.id, p]));

  const [storeId, setStoreId] = useState<number | null>(
    editingBill?.storeId ?? null,
  );
  // Create only — prefilled with "now" so the common case needs no input,
  // but editable for entering a bill that actually happened earlier.
  // Edit doesn't touch createdAt at all (not sent in that payload branch).
  const [createdAt, setCreatedAt] = useState(() =>
    toDatetimeLocalValue(new Date()),
  );
  const [customerId, setCustomerId] = useState<number | undefined>(
    editingBill?.customerId,
  );
  const [lastPrices, setLastPrices] = useState<Map<number, string>>(new Map());
  const [autoFilled, setAutoFilled] = useState(false);
  const [items, setItems] = useState<FormItem[]>(() =>
    editingBill
      ? editingBill.items.map((it) => ({
          key: `i${itemKeySeq++}`,
          productId: it.productId,
          quantity: it.quantity,
          price: it.price,
        }))
      : [createFormItem()],
  );
  const [customerName, setCustomerName] = useState(
    editingBill?.customerName ?? "",
  );
  const [customerAddress, setCustomerAddress] = useState(
    editingBill?.customerAddress ?? "",
  );
  const [customerPhone, setCustomerPhone] = useState(
    editingBill?.customerPhone ?? "",
  );
  const [discount, setDiscount] = useState(editingBill?.discount ?? "");
  const [shippingFee, setShippingFee] = useState(
    editingBill?.shippingFee ?? "",
  );
  const [slipFile, setSlipFile] = useState<File | null>(null);
  const [slipPreviewUrl, setSlipPreviewUrl] = useState<string | null>(null);
  const [errors, setErrors] = useState<FormErrors>(emptyErrors());
  const [submitting, setSubmitting] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [confirmLeaveOpen, setConfirmLeaveOpen] = useState(false);

  const [customerSuggestions, setCustomerSuggestions] = useState<
    CustomerListItem[]
  >([]);
  const [showCustomerSuggestions, setShowCustomerSuggestions] = useState(false);
  const [addressOptions, setAddressOptions] = useState<CustomerAddressItem[]>(
    [],
  );
  const [phoneOptions, setPhoneOptions] = useState<CustomerPhoneItem[]>([]);
  const nameBlurTimer = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  );

  // Debounced customer-name search.
  useEffect(() => {
    const query = customerName.trim();
    if (!query || !showCustomerSuggestions) return;
    let cancelled = false;
    const timer = setTimeout(() => {
      searchCustomers(query)
        .then((data) => {
          if (!cancelled) setCustomerSuggestions(data);
        })
        .catch(() => {
          if (!cancelled) setCustomerSuggestions([]);
        });
    }, 300);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [customerName, showCustomerSuggestions]);

  // Prefill prices from this store's last-used prices for this bill type —
  // fetched whenever the store changes, applied only when the user picks a
  // product (see handleItemProductChange), never overwriting what's typed.
  // No store selected yet -> nothing to fetch; handleItemProductChange also
  // guards on storeId so a stale map from a previous store is never used.
  useEffect(() => {
    if (storeId == null) return;
    let cancelled = false;
    getLastPrices(storeId, type)
      .then((rows) => {
        if (!cancelled) {
          setLastPrices(new Map(rows.map((r) => [r.productId, r.price])));
        }
      })
      .catch(() => {
        if (!cancelled) setLastPrices(new Map());
      });
    return () => {
      cancelled = true;
    };
  }, [storeId, type]);

  useEffect(() => {
    return () => {
      if (slipPreviewUrl) URL.revokeObjectURL(slipPreviewUrl);
    };
  }, [slipPreviewUrl]);

  useEffect(() => () => clearTimeout(nameBlurTimer.current), []);

  // Warn on browser/back navigation away from unsaved work — the in-app
  // "ยกเลิก" button below handles the same confirm for its own click.
  useEffect(() => {
    function onBeforeUnload(e: BeforeUnloadEvent) {
      if (dirty) e.preventDefault();
    }
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [dirty]);

  function clearError(key: keyof Omit<FormErrors, "items">) {
    setErrors((prev) => (prev[key] ? { ...prev, [key]: undefined } : prev));
  }

  function clearItemError(
    itemKey: string,
    field: "productId" | "quantity" | "price",
  ) {
    setErrors((prev) => {
      const row = prev.items[itemKey];
      if (!row?.[field]) return prev;
      const nextRow = { ...row, [field]: undefined };
      const nextItems = { ...prev.items };
      if (!nextRow.productId && !nextRow.quantity && !nextRow.price)
        delete nextItems[itemKey];
      else nextItems[itemKey] = nextRow;
      return { ...prev, items: nextItems };
    });
  }

  function handleStoreChange(value: string) {
    setDirty(true);
    setStoreId(value ? Number(value) : null);
    clearError("storeId");
  }

  function handleCustomerNameChange(value: string) {
    setDirty(true);
    setCustomerName(value);
    setCustomerId(undefined);
    setShowCustomerSuggestions(!!value.trim());
    clearError("customerName");
    clearError("customerId");
  }

  async function handleSelectCustomer(customer: CustomerListItem) {
    setDirty(true);
    setCustomerName(customer.name);
    setCustomerId(customer.id);
    setShowCustomerSuggestions(false);
    setCustomerSuggestions([]);
    setAddressOptions([]);
    setPhoneOptions([]);
    try {
      const [addresses, phones] = await Promise.all([
        getCustomerAddresses(customer.id),
        getCustomerPhones(customer.id),
      ]);
      setAddressOptions(addresses);
      setPhoneOptions(phones);
      // Backend orders default-first, so [0] is the default to prefill.
      if (addresses.length > 0) {
        setCustomerAddress(addresses[0].address);
        clearError("customerAddress");
      }
      if (phones.length > 0) setCustomerPhone(phones[0].phone);
    } catch {
      // Address/phone stay editable manually either way.
    }
  }

  function handleSlipChange(file: File | null) {
    setDirty(true);
    if (slipPreviewUrl) URL.revokeObjectURL(slipPreviewUrl);
    if (!file) {
      setSlipFile(null);
      setSlipPreviewUrl(null);
      return;
    }
    setSlipFile(file);
    setSlipPreviewUrl(URL.createObjectURL(file));
  }

  function handleItemProductChange(key: string, productId: number | null) {
    setDirty(true);
    clearItemError(key, "productId");
    // Prefill price only when the row doesn't already have one typed.
    const row = items.find((it) => it.key === key);
    const prefill =
      row && productId != null && storeId != null && !row.price
        ? lastPrices.get(productId)
        : undefined;
    if (prefill) setAutoFilled(true);
    setItems((prev) =>
      prev.map((it) =>
        it.key === key ? { ...it, productId, price: prefill ?? it.price } : it,
      ),
    );
  }
  function updateItemQuantity(key: string, raw: string) {
    setDirty(true);
    clearItemError(key, "quantity");
    const quantity = sanitizeNumberInput(raw);
    setItems((prev) =>
      prev.map((it) => (it.key === key ? { ...it, quantity } : it)),
    );
  }
  function updateItemPrice(key: string, raw: string) {
    setDirty(true);
    clearItemError(key, "price");
    const price = sanitizeNumberInput(raw);
    setItems((prev) =>
      prev.map((it) => (it.key === key ? { ...it, price } : it)),
    );
  }
  function addItem() {
    setDirty(true);
    clearError("itemsList");
    setItems((prev) => [...prev, createFormItem()]);
  }
  function removeItem(key: string) {
    setDirty(true);
    setItems((prev) => prev.filter((it) => it.key !== key));
  }

  const itemsComputed = items.map((it) => {
    const product =
      it.productId != null ? productById.get(it.productId) : undefined;
    const unit = product?.unit ?? "กก.";
    const subtotal = subtotalBaht(it.quantity, it.price);
    return { ...it, product, unit, subtotal };
  });
  const subtotalCentsList = itemsComputed.map((it) =>
    Math.round(it.subtotal * 100),
  );
  const itemsSubtotal = itemsComputed.reduce((a, it) => a + it.subtotal, 0);
  const netTotal = totalBaht(subtotalCentsList, discount, shippingFee);

  function validate(): FormErrors {
    const next = emptyErrors();
    if (storeId == null) next.storeId = "เลือกร้านก่อน";
    if (!customerName.trim())
      next.customerName = `กรอกชื่อ${config.partyLabel}`;
    if (!customerAddress.trim())
      next.customerAddress = `กรอกที่อยู่${config.partyLabel}`;
    if (items.length === 0) next.itemsList = "ต้องมีสินค้าอย่างน้อย 1 รายการ";
    if (toNumber(discount) < 0) next.discount = "ส่วนลดต้องไม่ติดลบ";
    if (toNumber(shippingFee) < 0) next.shippingFee = "ค่าส่งต้องไม่ติดลบ";
    items.forEach((it) => {
      const rowErr: FormErrors["items"][string] = {};
      const product =
        it.productId != null ? productById.get(it.productId) : undefined;
      if (!it.productId) rowErr.productId = "เลือกสินค้าของรายการนี้";
      if (!(toNumber(it.quantity) > 0)) {
        rowErr.quantity = "จำนวนต้องมากกว่า 0";
      } else if (
        product?.unit === BOTTLE_UNIT &&
        !Number.isInteger(toNumber(it.quantity))
      ) {
        rowErr.quantity = "ขวดต้องเป็นจำนวนเต็ม";
      }
      if (!(toNumber(it.price) > 0)) rowErr.price = "ราคาต้องมากกว่า 0";
      if (Object.keys(rowErr).length > 0) next.items[it.key] = rowErr;
    });
    return next;
  }

  function leave() {
    setConfirmLeaveOpen(false);
    if (editingBill) router.push(`/bills/${editingBill.id}`);
    else router.push("/");
  }

  function handleCancel() {
    if (dirty) {
      setConfirmLeaveOpen(true);
      return;
    }
    leave();
  }

  async function handleSubmit() {
    const nextErrors = validate();
    setErrors(nextErrors);
    if (hasErrors(nextErrors)) {
      showToast("กรอกข้อมูลให้ครบก่อนบันทึก", "error");
      focusFirstError();
      return;
    }

    const itemInputs: BillItemInput[] = items.map((it) => ({
      productId: it.productId!,
      quantity: it.quantity,
      price: it.price,
    }));

    const payload = {
      type,
      storeId: storeId!,
      customerId,
      customerName: customerName.trim(),
      customerAddress: customerAddress.trim(),
      customerPhone: customerPhone.trim(),
      discount: discount || "0",
      shippingFee: shippingFee || "0",
      items: itemInputs,
      // Edit never sends this — the backend ignores it on PUT anyway, but
      // omitting it here makes that explicit. An emptied/invalid picker
      // just falls back to the backend's own "now" default rather than
      // sending a bad date.
      ...(!editingBill &&
      createdAt &&
      !Number.isNaN(new Date(createdAt).getTime())
        ? { createdAt: new Date(createdAt).toISOString() }
        : {}),
    };

    setSubmitting(true);
    try {
      let bill: Bill;
      if (editingBill) {
        bill = await updateBill(editingBill.id, payload);
        setDirty(false);
        showToast("แก้ไขบิลเรียบร้อย");
        router.push(`/bills/${bill.id}`);
      } else {
        bill = await createBill(payload);
        setDirty(false);
        if (slipFile) {
          try {
            await uploadSlip(bill.id, slipFile);
          } catch {
            showToast("สร้างบิลแล้ว แต่แนบสลิปไม่สำเร็จ", "error");
            router.push(`/bills/${bill.id}`);
            return;
          }
        }
        showToast(`บันทึกบิล ${bill.receiptNo} แล้ว`);
        router.push(`/bills/${bill.id}`);
      }
    } catch (err) {
      if (err instanceof ApiError && err.fieldErrors.length > 0) {
        setErrors(applyServerFieldErrors(err.fieldErrors, items));
        showToast("กรอกข้อมูลไม่ถูกต้อง ตรวจสอบแต่ละแถว", "error");
        focusFirstError();
      } else {
        showToast(
          err instanceof Error ? err.message : "บันทึกบิลไม่สำเร็จ",
          "error",
        );
      }
    } finally {
      setSubmitting(false);
    }
  }

  const storeName =
    stores.find((s) => s.id === storeId)?.name ?? editingBill?.storeName ?? "";
  const submitLabel = submitting
    ? "กำลังบันทึก…"
    : isEditing
      ? config.editSubmitLabel
      : config.submitLabel;
  const fieldClass = (err?: string) => `mk-field ${err ? "has-error" : ""}`;

  return (
    <div className={`flex flex-1 flex-col ${config.theme}`}>
      <div className="mk-topbar">
        <button type="button" className="mk-back" onClick={handleCancel}>
          <ChevronLeft />
          ยกเลิก
        </button>
        <span className="mk-badge mk-badge--type mr-2">{config.title}</span>
      </div>

      <div className="px-4 pb-6">
        <div className="mk-eyebrow text-(--type-text)!">
          {isEditing ? `แก้ไข${config.title}` : config.createTitle}
        </div>
        <h1 className="mk-h1">{isEditing ? "แก้ไขบิล" : config.title}</h1>
        <p className="mk-caption mt-1 mb-5 text-[13px]!">
          เลขเล่มและเลขที่ ระบบออกให้อัตโนมัติ — กรอกราคาต่อหน่วยเองทุกรายการ
        </p>

        {/* Store (+ created-at on create) */}
        <div className="mk-card mk-card__pad">
          {!isEditing && (
            <div className="mk-field">
              <label className="mk-label" htmlFor="bill-created-at">
                เวลาที่สร้างบิล <span className="opt">(ไม่บังคับ)</span>
              </label>
              <input
                id="bill-created-at"
                type="datetime-local"
                value={createdAt}
                onChange={(e) => {
                  setDirty(true);
                  setCreatedAt(e.target.value);
                }}
                className="mk-input num"
              />
              <div className="mk-help">
                ค่าเริ่มต้นคือเวลาปัจจุบัน — แก้ไขได้ถ้ากรอกบิลย้อนหลัง
              </div>
            </div>
          )}

          <div className={fieldClass(errors.storeId)}>
            <label className="mk-label" htmlFor="bill-store">
              ร้าน <span className="req">*</span>
            </label>
            {isEditing ? (
              // Store and type can't change after issue (the server rejects
              // it), so edit shows the store read-only (spec §7 #5).
              <>
                <input
                  id="bill-store"
                  className="mk-input"
                  readOnly
                  value={storeName}
                />
                <div className="mk-help">
                  ร้านและประเภทบิลแก้ไขไม่ได้หลังออกบิล
                </div>
              </>
            ) : (
              <>
                <select
                  id="bill-store"
                  value={storeId ?? ""}
                  onChange={(e) => handleStoreChange(e.target.value)}
                  className="mk-input"
                >
                  <option value="">— เลือกร้าน —</option>
                  {stores.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
                <div className="mk-help">
                  เลือกร้านเพื่อดึงราคาที่เคยใช้ล่าสุดของร้านนี้มาเติมให้
                  (แก้ไขได้)
                </div>
              </>
            )}
            <FieldError message={errors.storeId} />
          </div>
        </div>

        {/* Party — before the items, the same order as on the paper bill */}
        <h2 className="mk-title mt-6 mb-2">{config.partyLabel}</h2>
        <div className="mk-card mk-card__pad">
          <div
            className={`${fieldClass(errors.customerName || errors.customerId)} relative`}
          >
            <label className="mk-label" htmlFor="bill-party-name">
              ชื่อ{config.partyLabel} <span className="req">*</span>
            </label>
            <input
              id="bill-party-name"
              value={customerName}
              onChange={(e) => handleCustomerNameChange(e.target.value)}
              onFocus={() =>
                setShowCustomerSuggestions(
                  !!customerName.trim() && customerId == null,
                )
              }
              onBlur={() => {
                nameBlurTimer.current = setTimeout(
                  () => setShowCustomerSuggestions(false),
                  120,
                );
              }}
              placeholder="เช่น ร้านขนมป้ามาลี"
              autoComplete="off"
              className="mk-input"
            />
            {showCustomerSuggestions && customerSuggestions.length > 0 && (
              <div className="mk-ac">
                {customerSuggestions.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      handleSelectCustomer(c);
                    }}
                  >
                    <b>{c.name}</b>
                    <small>
                      C{c.id}
                      {c.phone ? ` · ${c.phone}` : ""}
                    </small>
                  </button>
                ))}
              </div>
            )}
            {customerId == null &&
              customerName.trim() &&
              !showCustomerSuggestions && (
                <div className="mk-help">
                  {config.partyLabel}ใหม่ — จะบันทึกไว้ให้เลือกครั้งหน้า
                </div>
              )}
            <FieldError message={errors.customerName || errors.customerId} />
          </div>

          <div className={fieldClass(errors.customerAddress)}>
            <label className="mk-label" htmlFor="bill-party-address">
              ที่อยู่{config.partyLabel} <span className="req">*</span>
            </label>
            {addressOptions.length > 1 && (
              <div className="mk-chips mb-2">
                {addressOptions.map((a) => (
                  <button
                    key={a.id}
                    type="button"
                    className="mk-chip mk-chip--sm max-w-[250px]"
                    aria-pressed={customerAddress === a.address}
                    onClick={() => {
                      setDirty(true);
                      setCustomerAddress(a.address);
                      clearError("customerAddress");
                    }}
                  >
                    <span className="truncate">{a.address}</span>
                    {a.isDefault && (
                      <span className="mk-badge mk-badge--default">
                        ค่าเริ่มต้น
                      </span>
                    )}
                  </button>
                ))}
              </div>
            )}
            <textarea
              id="bill-party-address"
              value={customerAddress}
              onChange={(e) => {
                setDirty(true);
                setCustomerAddress(e.target.value);
                clearError("customerAddress");
              }}
              rows={2}
              placeholder="บ้านเลขที่ ตำบล อำเภอ จังหวัด"
              className="mk-input"
            />
            <FieldError message={errors.customerAddress} />
          </div>

          <div className="mk-field">
            <label className="mk-label" htmlFor="bill-party-phone">
              เบอร์โทรศัพท์{config.partyLabel}{" "}
              <span className="opt">(ไม่บังคับ)</span>
            </label>
            {phoneOptions.length > 1 && (
              <div className="mk-chips mb-2">
                {phoneOptions.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    className="mk-chip mk-chip--sm num"
                    aria-pressed={customerPhone === p.phone}
                    onClick={() => {
                      setDirty(true);
                      setCustomerPhone(p.phone);
                    }}
                  >
                    {p.phone}
                    {p.isDefault && (
                      <span className="mk-badge mk-badge--default">
                        ค่าเริ่มต้น
                      </span>
                    )}
                  </button>
                ))}
              </div>
            )}
            <input
              id="bill-party-phone"
              value={customerPhone}
              onChange={(e) => {
                setDirty(true);
                setCustomerPhone(e.target.value);
              }}
              type="tel"
              inputMode="tel"
              placeholder="เช่น 0812345678"
              autoComplete="off"
              className="mk-input num"
            />
          </div>
        </div>

        {/* Items */}
        <div className="mt-6 mb-2 flex items-baseline justify-between">
          <h2 className="mk-title">รายการสินค้า</h2>
          <span className="mk-caption">{items.length} รายการ</span>
        </div>
        {errors.itemsList && (
          <div className="has-error mb-2">
            <FieldError message={errors.itemsList} />
          </div>
        )}
        {autoFilled && storeName && (
          <div className="mk-alert mk-alert--auto mb-2">
            <RefreshCw />
            เติมราคาล่าสุดของ {storeName} ให้แล้ว — แก้ได้
          </div>
        )}
        {itemsComputed.map((it, idx) => {
          const rowErr = errors.items[it.key];
          const isBottle = it.unit === BOTTLE_UNIT;
          const n = String(idx + 1).padStart(2, "0");
          return (
            <div
              key={it.key}
              className={`mk-item ${rowErr ? "has-error" : ""}`}
            >
              <div className="mk-item__h">
                <span className="mk-item__n">รายการ {n}</span>
                <button
                  type="button"
                  onClick={() => removeItem(it.key)}
                  disabled={items.length <= 1}
                  aria-label={`ลบรายการ ${n}`}
                  className="mk-iconbtn mk-iconbtn--danger h-10! w-10! disabled:opacity-35"
                >
                  <Trash2 />
                </button>
              </div>
              <div className={fieldClass(rowErr?.productId)}>
                <label className="mk-label" htmlFor={`item-${it.key}-product`}>
                  สินค้า <span className="req">*</span>
                </label>
                <select
                  id={`item-${it.key}-product`}
                  value={it.productId ?? ""}
                  onChange={(e) =>
                    handleItemProductChange(
                      it.key,
                      e.target.value ? Number(e.target.value) : null,
                    )
                  }
                  className="mk-input"
                >
                  <option value="">— เลือกสินค้า —</option>
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.unit})
                    </option>
                  ))}
                </select>
                <FieldError message={rowErr?.productId} />
              </div>
              <div className="mk-grid2 mt-3">
                <div className={fieldClass(rowErr?.quantity)}>
                  <label className="mk-label" htmlFor={`item-${it.key}-qty`}>
                    {quantityFieldLabel(it.unit)} <span className="req">*</span>
                  </label>
                  <input
                    id={`item-${it.key}-qty`}
                    value={it.quantity}
                    onChange={(e) => updateItemQuantity(it.key, e.target.value)}
                    inputMode={isBottle ? "numeric" : "decimal"}
                    placeholder="0"
                    className="mk-input num"
                  />
                  {isBottle && !rowErr?.quantity && (
                    <div className="mk-help">จำนวนเต็มเท่านั้น</div>
                  )}
                  <FieldError message={rowErr?.quantity} />
                </div>
                <div className={fieldClass(rowErr?.price)}>
                  <label className="mk-label" htmlFor={`item-${it.key}-price`}>
                    {priceFieldLabel(it.unit)} <span className="req">*</span>
                  </label>
                  <input
                    id={`item-${it.key}-price`}
                    value={it.price}
                    onChange={(e) => updateItemPrice(it.key, e.target.value)}
                    inputMode="decimal"
                    placeholder="0"
                    className="mk-input num"
                  />
                  <FieldError message={rowErr?.price} />
                </div>
              </div>
              <div className="mk-item__sum">
                <span className="num">
                  {it.product && it.quantity && it.price
                    ? `${formatQuantity(it.quantity, it.unit)} × ฿${toNumber(it.price).toLocaleString("en-US", { maximumFractionDigits: 2 })}`
                    : "กรอกจำนวนและราคา"}
                </span>
                <b>รวม {formatBaht(it.subtotal)}</b>
              </div>
            </div>
          );
        })}
        <button
          type="button"
          onClick={addItem}
          className="mk-btn mk-btn--outline mk-btn--block mt-3 border-dashed!"
        >
          <Plus />
          เพิ่มสินค้าอีกรายการ
        </button>

        {/* Adjustments + slip */}
        <h2 className="mk-title mt-6 mb-2">ปรับยอด</h2>
        <div className="mk-card mk-card__pad">
          <div className="mk-grid2">
            <div className={fieldClass(errors.discount)}>
              <label className="mk-label" htmlFor="bill-discount">
                ส่วนลด <span className="opt">(ไม่บังคับ)</span>
              </label>
              <div className="mk-input-wrap">
                <input
                  id="bill-discount"
                  value={discount}
                  onChange={(e) => {
                    setDirty(true);
                    setDiscount(sanitizeNumberInput(e.target.value));
                    clearError("discount");
                  }}
                  inputMode="decimal"
                  placeholder="0"
                  className="mk-input num"
                />
                <span className="mk-unit">฿</span>
              </div>
              <FieldError message={errors.discount} />
            </div>
            <div className={fieldClass(errors.shippingFee)}>
              <label className="mk-label" htmlFor="bill-shipping">
                ค่าส่ง <span className="opt">(ไม่บังคับ)</span>
              </label>
              <div className="mk-input-wrap">
                <input
                  id="bill-shipping"
                  value={shippingFee}
                  onChange={(e) => {
                    setDirty(true);
                    setShippingFee(sanitizeNumberInput(e.target.value));
                    clearError("shippingFee");
                  }}
                  inputMode="decimal"
                  placeholder="0"
                  className="mk-input num"
                />
                <span className="mk-unit">฿</span>
              </div>
              <FieldError message={errors.shippingFee} />
            </div>
          </div>

          {/* Slip — create only; edit manages the slip from the detail page */}
          {!isEditing && (
            <div className="mk-field">
              <div className="mk-label">
                สลิปโอนเงิน <span className="opt">(ไม่บังคับ)</span>
              </div>
              {slipFile ? (
                <div className="mk-thumbrow">
                  {/* eslint-disable-next-line @next/next/no-img-element -- local object URL preview */}
                  <img
                    src={slipPreviewUrl ?? ""}
                    alt="สลิปที่แนบ"
                    className="mk-thumb"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[14px] font-semibold">
                      {slipFile.name}
                    </div>
                    <div className="mk-caption">
                      {(slipFile.size / 1024 / 1024).toFixed(1)} MB ·
                      อัปโหลดหลังบันทึกบิล
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleSlipChange(null)}
                    className="mk-btn mk-btn--sm mk-btn--danger-ghost"
                  >
                    ลบสลิป
                  </button>
                </div>
              ) : (
                <label className="mk-upload min-h-[88px]!">
                  <Upload />
                  แนบรูปสลิป (ไม่บังคับ)
                  <small>JPG · PNG · WebP ไม่เกิน 10 MB</small>
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={(e) =>
                      handleSlipChange(e.target.files?.[0] ?? null)
                    }
                    className="hidden"
                  />
                </label>
              )}
            </div>
          )}
        </div>

        {/* Summary */}
        <h2 className="mk-title mt-6 mb-2">สรุปยอด</h2>
        <div className="mk-card mk-card__pad">
          <div className="mk-sumrows">
            <div>
              <span>จำนวนรายการ</span>
              <span>{items.length} รายการ</span>
            </div>
            <div>
              <span>ยอดรวมสินค้า</span>
              <span className="num">
                {itemsSubtotal ? formatBaht(itemsSubtotal) : "—"}
              </span>
            </div>
            <div>
              <span>ส่วนลด</span>
              <span className="num">
                {toNumber(discount) ? `− ${formatBaht(discount)}` : "฿0"}
              </span>
            </div>
            <div>
              <span>ค่าจัดส่ง</span>
              <span className="num">
                {toNumber(shippingFee) ? `+ ${formatBaht(shippingFee)}` : "฿0"}
              </span>
            </div>
            <div className="is-total">
              <span>ยอดสุทธิ</span>
              <span className="num">
                {netTotal < 0 ? "−" : ""}
                {formatBaht(Math.abs(netTotal))}
              </span>
            </div>
          </div>
          {netTotal < 0 && (
            <div className="mk-alert mk-alert--warning mt-3">
              <TriangleAlert />
              ยอดสุทธิติดลบ — ส่วนลดมากกว่ายอดรวมสินค้ารวมค่าส่ง
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={handleCancel}
          disabled={submitting}
          className="mk-btn mk-btn--outline mk-btn--block mt-4"
        >
          ยกเลิก
        </button>
      </div>

      {/* Sticky footer: net total + save always in reach (spec §7 #2) */}
      <div className="mk-footer">
        <div className="mk-footer__total">
          <small>ยอดสุทธิ · {items.length} รายการ</small>
          <b>
            {netTotal < 0 ? "−" : ""}
            {formatBaht(Math.abs(netTotal))}
          </b>
        </div>
        <button
          type="button"
          onClick={handleSubmit}
          disabled={submitting}
          className="mk-btn mk-btn--type mk-btn--lg"
        >
          {submitting && <span className="mk-spin" />}
          {submitLabel}
        </button>
      </div>

      <ConfirmLeave
        open={confirmLeaveOpen}
        title={isEditing ? "ทิ้งการแก้ไข?" : "ยกเลิกบิลนี้?"}
        body={
          isEditing
            ? "การแก้ไขที่ยังไม่บันทึกจะหายไป บิลเดิมยังอยู่ครบ"
            : "ข้อมูลที่กรอกไว้จะหายไปทั้งหมด"
        }
        stayLabel={isEditing ? "แก้ไขต่อ" : "กรอกต่อ"}
        leaveLabel={isEditing ? "ทิ้งการแก้ไข" : "ยกเลิกบิล"}
        onStay={() => setConfirmLeaveOpen(false)}
        onLeave={leave}
      />
    </div>
  );
}
