"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Check,
  ChevronDown,
  Plus,
  Trash2,
  Upload,
} from "lucide-react";
import { ApiError, createBill, updateBill, uploadSlip, type BillItemInput } from "@/lib/api/bills";
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
import { formatBaht, priceFieldLabel, quantityFieldLabel, toDatetimeLocalValue } from "@/lib/format";
import { subtotalBaht, toNumber, totalBaht } from "@/lib/money";
import { useToast } from "@/components/toast-provider";
import { BILL_TYPE_CONFIG, type BillType } from "@/lib/bill-type";
import type { Bill, Store } from "@/lib/types";

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
  items: Record<string, { quantity?: string; price?: string; productId?: string }>;
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
  const [createdAt, setCreatedAt] = useState(() => toDatetimeLocalValue(new Date()));
  const [customerId, setCustomerId] = useState<number | undefined>(
    editingBill?.customerId,
  );
  const [lastPrices, setLastPrices] = useState<Map<number, string>>(new Map());
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
  const [shippingFee, setShippingFee] = useState(editingBill?.shippingFee ?? "");
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

  // Warn on browser/back navigation away from unsaved work — the in-app
  // "ยกเลิก" button below handles the same confirm for its own click.
  useEffect(() => {
    function onBeforeUnload(e: BeforeUnloadEvent) {
      if (dirty) e.preventDefault();
    }
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [dirty]);

  function handleStoreChange(value: string) {
    setDirty(true);
    setStoreId(value ? Number(value) : null);
  }

  function handleCustomerNameChange(value: string) {
    setDirty(true);
    setCustomerName(value);
    setCustomerId(undefined);
    setShowCustomerSuggestions(!!value.trim());
  }

  async function handleSelectCustomer(customer: CustomerListItem) {
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
      if (addresses.length > 0) setCustomerAddress(addresses[0].address);
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

  function clearSlip() {
    handleSlipChange(null);
  }

  function handleItemProductChange(key: string, productId: number | null) {
    setDirty(true);
    setItems((prev) =>
      prev.map((it) => {
        if (it.key !== key) return it;
        // Prefill price only when the row doesn't already have one typed.
        const prefill =
          productId != null && storeId != null && !it.price
            ? lastPrices.get(productId)
            : undefined;
        return { ...it, productId, price: prefill ?? it.price };
      }),
    );
  }
  function updateItemQuantity(key: string, raw: string) {
    setDirty(true);
    const quantity = sanitizeNumberInput(raw);
    setItems((prev) =>
      prev.map((it) => (it.key === key ? { ...it, quantity } : it)),
    );
  }
  function updateItemPrice(key: string, raw: string) {
    setDirty(true);
    const price = sanitizeNumberInput(raw);
    setItems((prev) => prev.map((it) => (it.key === key ? { ...it, price } : it)));
  }
  function addItem() {
    setDirty(true);
    setItems((prev) => [...prev, createFormItem()]);
  }
  function removeItem(key: string) {
    setDirty(true);
    setItems((prev) => prev.filter((it) => it.key !== key));
  }

  const itemsComputed = items.map((it) => {
    const product = it.productId != null ? productById.get(it.productId) : undefined;
    const unit = product?.unit ?? "กก.";
    const subtotal = subtotalBaht(it.quantity, it.price);
    return { ...it, unit, subtotal };
  });
  const subtotalCentsList = itemsComputed.map((it) => Math.round(it.subtotal * 100));
  const itemsSubtotal = itemsComputed.reduce((a, it) => a + it.subtotal, 0);
  const netTotal = totalBaht(subtotalCentsList, discount, shippingFee);

  function validate(): FormErrors {
    const next = emptyErrors();
    if (storeId == null) next.storeId = "เลือกสาขาก่อน";
    if (!customerName.trim())
      next.customerName = `กรอกชื่อ${config.partyLabel}`;
    if (!customerAddress.trim())
      next.customerAddress = `กรอกที่อยู่${config.partyLabel}`;
    if (items.length === 0) next.itemsList = "ต้องมีสินค้าอย่างน้อย 1 รายการ";
    if (toNumber(discount) < 0) next.discount = "ส่วนลดต้องไม่ติดลบ";
    if (toNumber(shippingFee) < 0) next.shippingFee = "ค่าส่งต้องไม่ติดลบ";
    items.forEach((it) => {
      const rowErr: FormErrors["items"][string] = {};
      const product = it.productId != null ? productById.get(it.productId) : undefined;
      if (!it.productId) rowErr.productId = "เลือกสินค้าของรายการนี้";
      if (!(toNumber(it.quantity) > 0)) {
        rowErr.quantity = "จำนวนต้องมากกว่า 0";
      } else if (product?.unit === BOTTLE_UNIT && !Number.isInteger(toNumber(it.quantity))) {
        rowErr.quantity = "ขวดต้องเป็นจำนวนเต็ม";
      }
      if (!(toNumber(it.price) > 0)) rowErr.price = "ราคาต้องมากกว่า 0";
      if (Object.keys(rowErr).length > 0) next.items[it.key] = rowErr;
    });
    return next;
  }

  function handleCancel() {
    if (dirty) {
      setConfirmLeaveOpen(true);
      return;
    }
    if (editingBill) router.push(`/bills/${editingBill.id}`);
    else router.push("/");
  }

  function confirmLeave() {
    setConfirmLeaveOpen(false);
    if (editingBill) router.push(`/bills/${editingBill.id}`);
    else router.push("/");
  }

  async function handleSubmit() {
    const nextErrors = validate();
    setErrors(nextErrors);
    if (hasErrors(nextErrors)) {
      showToast("กรอกข้อมูลให้ครบก่อนบันทึก");
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
      ...(!editingBill && createdAt && !Number.isNaN(new Date(createdAt).getTime())
        ? { createdAt: new Date(createdAt).toISOString() }
        : {}),
    };

    setSubmitting(true);
    try {
      let bill: Bill;
      if (editingBill) {
        bill = await updateBill(editingBill.id, payload);
        showToast("แก้ไขบิลเรียบร้อย");
        router.push(`/bills/${bill.id}`);
      } else {
        bill = await createBill(payload);
        if (slipFile) {
          try {
            await uploadSlip(bill.id, slipFile);
          } catch {
            showToast("สร้างบิลแล้ว แต่แนบสลิปไม่สำเร็จ");
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
        showToast("กรอกข้อมูลไม่ถูกต้อง ตรวจสอบแต่ละแถว");
      } else {
        showToast(err instanceof Error ? err.message : "บันทึกบิลไม่สำเร็จ");
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex flex-1 flex-col pb-28">
      <div className={`border-b-2 border-divider px-5 pt-[26px] pb-4`}>
        <div
          className={`text-[10px] leading-none font-semibold tracking-[.18em] uppercase ${config.color.text}`}
        >
          {isEditing ? `แก้ไข${config.title}` : config.createTitle}
        </div>
        <h1 className="mt-2.5 text-[30px] leading-[1.15] font-bold tracking-[-.01em]">
          {isEditing ? "แก้ไขบิล" : config.title}
        </h1>
        <p className="mt-2 text-[12.5px] leading-[1.6] text-ink/55">
          เลขเล่มและเลขที่ ระบบออกให้อัตโนมัติ — กรอกราคาต่อหน่วยเองทุกรายการ
        </p>
      </div>

      <div className="flex flex-col gap-[22px] border-b-2 border-divider bg-surface p-5">
        {/* Created-at — create only; prefilled with now, editable for a
            bill entered after the fact. Not part of the numbered sequence
            below since it's document metadata, not a required decision. */}
        {!isEditing && (
          <div>
            <label className="mb-2.5 block text-[10px] font-semibold tracking-[.13em] text-ink/55 uppercase">
              เวลาที่สร้างบิล
            </label>
            <input
              type="datetime-local"
              value={createdAt}
              onChange={(e) => {
                setDirty(true);
                setCreatedAt(e.target.value);
              }}
              className="h-12 w-full border border-divider bg-bg px-[13px] text-[15px] outline-none"
            />
            <div className="mt-[7px] text-[11.5px] leading-[1.5] text-ink/50">
              ค่าเริ่มต้นคือเวลาปัจจุบัน — แก้ไขได้ถ้ากรอกบิลย้อนหลัง
            </div>
          </div>
        )}

        {/* 1. Store */}
        <div>
          <label className="mb-2.5 block text-[10px] font-semibold tracking-[.13em] text-ink/55 uppercase">
            1 · สาขา <span className={config.color.text}>*</span>
          </label>
          <div className="relative border border-divider bg-bg">
            <select
              value={storeId ?? ""}
              onChange={(e) => handleStoreChange(e.target.value)}
              className="h-[50px] w-full cursor-pointer appearance-none border-0 bg-transparent px-[13px] pr-11 text-[14.5px] font-semibold outline-none"
            >
              <option value="">— เลือกสาขา —</option>
              {stores.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
            <ChevronDown
              size={15}
              strokeWidth={2.2}
              className="pointer-events-none absolute top-[18px] right-3.5 text-ink/50"
            />
          </div>
          <div className="mt-[7px] text-[11.5px] leading-[1.5] text-ink/50">
            เลือกสาขาเพื่อดึงราคาที่เคยใช้ล่าสุดของสาขานี้มาเติมให้ (แก้ไขได้)
          </div>
          {errors.storeId && (
            <div className="mt-2 text-[11.5px] leading-[1.4] text-danger">
              {errors.storeId}
            </div>
          )}
        </div>

        {/* 2. Items */}
        <div>
          <div className="mb-2.5 flex items-baseline justify-between gap-3">
            <label className="text-[10px] font-semibold tracking-[.13em] text-ink/55 uppercase">
              2 · รายการสินค้า <span className={config.color.text}>*</span>
            </label>
            <span className="font-num text-[10.5px] text-ink/50">
              {items.length} รายการ
            </span>
          </div>

          <div className="flex flex-col gap-3">
            {itemsComputed.map((it, idx) => {
              const rowErr = errors.items[it.key];
              return (
                <div key={it.key} className="border border-divider bg-bg">
                  <div className="flex items-center justify-between gap-2 border-b border-ink/12 py-2 pr-2 pl-[13px]">
                    <span className="font-num text-[10px] tracking-[.13em] text-ink/50">
                      รายการ {String(idx + 1).padStart(2, "0")}
                    </span>
                    <button
                      type="button"
                      onClick={() => removeItem(it.key)}
                      disabled={items.length <= 1}
                      className={`flex h-9 w-9 items-center justify-center border-0 bg-transparent text-danger ${
                        items.length <= 1 ? "opacity-30" : ""
                      }`}
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                  <div className="relative border-b border-ink/12">
                    <select
                      value={it.productId ?? ""}
                      onChange={(e) =>
                        handleItemProductChange(
                          it.key,
                          e.target.value ? Number(e.target.value) : null,
                        )
                      }
                      className="h-12 w-full cursor-pointer appearance-none border-0 bg-transparent px-[13px] pr-10 text-[13.5px] font-semibold outline-none"
                    >
                      <option value="">— เลือกสินค้า —</option>
                      {products.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name} ({p.unit})
                        </option>
                      ))}
                    </select>
                    <ChevronDown
                      size={14}
                      strokeWidth={2.2}
                      className="pointer-events-none absolute top-[17px] right-3.5 text-ink/50"
                    />
                  </div>
                  {rowErr?.productId && (
                    <div className="border-b border-ink/12 px-[13px] py-[9px] text-[11.5px] leading-[1.4] text-danger">
                      {rowErr.productId}
                    </div>
                  )}
                  <div className="grid grid-cols-2">
                    <div className="border-r border-b border-ink/12">
                      <div className="px-[13px] pt-2 text-[10px] font-semibold text-ink/50">
                        {quantityFieldLabel(it.unit)}
                        {it.unit === BOTTLE_UNIT && " · จำนวนเต็มเท่านั้น"}
                      </div>
                      <input
                        value={it.quantity}
                        onChange={(e) => updateItemQuantity(it.key, e.target.value)}
                        inputMode="decimal"
                        placeholder="0"
                        className="font-num h-11 w-full border-0 bg-transparent px-[13px] text-[16px] font-bold outline-none"
                      />
                    </div>
                    <div className="border-b border-ink/12">
                      <div className="px-[13px] pt-2 text-[10px] font-semibold text-ink/50">
                        {priceFieldLabel(it.unit)}
                      </div>
                      <input
                        value={it.price}
                        onChange={(e) => updateItemPrice(it.key, e.target.value)}
                        inputMode="decimal"
                        placeholder="0"
                        className="font-num h-11 w-full border-0 bg-transparent px-[13px] text-[16px] font-bold outline-none"
                      />
                    </div>
                  </div>
                  {(rowErr?.quantity || rowErr?.price) && (
                    <div className="border-b border-ink/12 px-[13px] py-[9px] text-[11.5px] leading-[1.4] text-danger">
                      {[rowErr.quantity, rowErr.price].filter(Boolean).join(" · ")}
                    </div>
                  )}
                  <div className="flex items-center justify-end px-[13px] py-2">
                    <span className="font-num text-[14.5px] font-bold text-ink/70">
                      รวม {it.subtotal ? formatBaht(it.subtotal) : "฿0"}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
          <button
            type="button"
            onClick={addItem}
            className={`mt-3 flex min-h-12 w-full items-center gap-[9px] border border-accent bg-accent-100 px-3.5 text-[13px] font-semibold text-accent hover:bg-accent-200`}
          >
            <Plus size={16} strokeWidth={2.2} />
            เพิ่มสินค้าอีกรายการ
          </button>
          {errors.itemsList && (
            <div className="mt-2 text-[11.5px] leading-[1.4] text-danger">
              {errors.itemsList}
            </div>
          )}
        </div>

        {/* 3. Customer/party name */}
        <div className="relative">
          <label className="mb-2.5 block text-[10px] font-semibold tracking-[.13em] text-ink/55 uppercase">
            3 · ชื่อ{config.partyLabel} <span className={config.color.text}>*</span>
          </label>
          <input
            value={customerName}
            onChange={(e) => handleCustomerNameChange(e.target.value)}
            onFocus={() => setShowCustomerSuggestions(!!customerName.trim())}
            onBlur={() => setShowCustomerSuggestions(false)}
            placeholder={`เช่น ร้านขนมป้ามาลี`}
            autoComplete="off"
            className="h-12 w-full border border-divider bg-bg px-[13px] text-[15px] outline-none"
          />
          {showCustomerSuggestions && customerSuggestions.length > 0 && (
            <div className="absolute inset-x-0 top-full z-10 mt-1 border border-divider bg-surface shadow-[0_8px_20px_rgba(0,0,0,0.12)]">
              {customerSuggestions.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    handleSelectCustomer(c);
                  }}
                  className="block w-full border-b border-ink/12 px-[13px] py-2.5 text-left text-[13.5px] font-semibold last:border-b-0 hover:bg-accent-100"
                >
                  {c.name}
                </button>
              ))}
            </div>
          )}
          {errors.customerName && (
            <div className="mt-2 text-[11.5px] leading-[1.4] text-danger">
              {errors.customerName}
            </div>
          )}
        </div>

        {/* 4. Address */}
        <div>
          <label className="mb-2.5 block text-[10px] font-semibold tracking-[.13em] text-ink/55 uppercase">
            4 · ที่อยู่{config.partyLabel} <span className={config.color.text}>*</span>
          </label>
          <textarea
            value={customerAddress}
            onChange={(e) => {
              setDirty(true);
              setCustomerAddress(e.target.value);
            }}
            rows={2}
            placeholder="บ้านเลขที่ ตำบล อำเภอ จังหวัด"
            className="w-full resize-none border border-divider bg-bg px-[13px] py-3 text-[15px] leading-[1.5] outline-none"
          />
          {addressOptions.length > 1 && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {addressOptions.map((a) => (
                <button
                  key={a.id}
                  type="button"
                  onClick={() => {
                    setDirty(true);
                    setCustomerAddress(a.address);
                  }}
                  className={`flex items-center gap-1.5 border px-2.5 py-1.5 text-left text-[11.5px] leading-[1.4] ${
                    customerAddress === a.address
                      ? "border-accent bg-accent-100 text-accent"
                      : "border-divider bg-bg text-ink/65"
                  }`}
                >
                  <span className="max-w-[180px] truncate">{a.address}</span>
                  {a.isDefault && (
                    <span className="flex-none text-[9.5px] font-semibold uppercase opacity-75">
                      ค่าเริ่มต้น
                    </span>
                  )}
                </button>
              ))}
            </div>
          )}
          {errors.customerAddress && (
            <div className="mt-2 text-[11.5px] leading-[1.4] text-danger">
              {errors.customerAddress}
            </div>
          )}
        </div>

        {/* 5. Phone */}
        <div>
          <label className="mb-2.5 block text-[10px] font-semibold tracking-[.13em] text-ink/55 uppercase">
            5 · เบอร์โทรศัพท์{config.partyLabel}
          </label>
          <input
            value={customerPhone}
            onChange={(e) => {
              setDirty(true);
              setCustomerPhone(e.target.value);
            }}
            inputMode="tel"
            placeholder="เช่น 0812345678"
            autoComplete="off"
            className="h-12 w-full border border-divider bg-bg px-[13px] text-[15px] outline-none"
          />
          {phoneOptions.length > 1 && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {phoneOptions.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => {
                    setDirty(true);
                    setCustomerPhone(p.phone);
                  }}
                  className={`flex items-center gap-1.5 border px-2.5 py-1.5 text-[11.5px] leading-[1.4] ${
                    customerPhone === p.phone
                      ? "border-accent bg-accent-100 text-accent"
                      : "border-divider bg-bg text-ink/65"
                  }`}
                >
                  <span>{p.phone}</span>
                  {p.isDefault && (
                    <span className="flex-none text-[9.5px] font-semibold uppercase opacity-75">
                      ค่าเริ่มต้น
                    </span>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Discount / shipping — used by both bill types */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-2.5 block text-[10px] font-semibold tracking-[.13em] text-ink/55 uppercase">
              ส่วนลด
            </label>
            <input
              value={discount}
              onChange={(e) => {
                setDirty(true);
                setDiscount(sanitizeNumberInput(e.target.value));
              }}
              inputMode="decimal"
              placeholder="0"
              className="h-12 w-full border border-divider bg-bg px-[13px] text-[15px] outline-none"
            />
            {errors.discount && (
              <div className="mt-2 text-[11.5px] leading-[1.4] text-danger">
                {errors.discount}
              </div>
            )}
          </div>
          <div>
            <label className="mb-2.5 block text-[10px] font-semibold tracking-[.13em] text-ink/55 uppercase">
              ค่าส่ง
            </label>
            <input
              value={shippingFee}
              onChange={(e) => {
                setDirty(true);
                setShippingFee(sanitizeNumberInput(e.target.value));
              }}
              inputMode="decimal"
              placeholder="0"
              className="h-12 w-full border border-divider bg-bg px-[13px] text-[15px] outline-none"
            />
            {errors.shippingFee && (
              <div className="mt-2 text-[11.5px] leading-[1.4] text-danger">
                {errors.shippingFee}
              </div>
            )}
          </div>
        </div>

        {/* Slip — create only; edit manages the slip from the detail page */}
        {!isEditing && (
          <div>
            <label className="mb-2.5 block text-[10px] font-semibold tracking-[.13em] text-ink/55 uppercase">
              สลิปโอนเงิน
            </label>
            {slipFile ? (
              <div className="flex items-stretch gap-3 border border-divider bg-bg p-2.5">
                <div
                  className="h-[74px] w-[74px] flex-none border border-ink/15 bg-cover bg-center"
                  style={{ backgroundImage: `url("${slipPreviewUrl}")` }}
                />
                <div className="flex min-w-0 flex-1 flex-col justify-center gap-2">
                  <div className="truncate text-[12.5px] leading-[1.35] font-semibold">
                    {slipFile.name}
                  </div>
                  <button
                    type="button"
                    onClick={clearSlip}
                    className="self-start border-0 bg-transparent p-0 text-[12px] font-semibold text-danger"
                  >
                    ลบสลิป
                  </button>
                </div>
              </div>
            ) : (
              <label className="box-border flex cursor-pointer items-center gap-3 border border-dashed border-divider bg-bg px-3.5 py-[18px]">
                <Upload size={20} strokeWidth={1.8} className={config.color.text} />
                <span className="text-[13px] font-semibold text-ink/60">
                  แนบรูปสลิป (ไม่บังคับ)
                </span>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={(e) => handleSlipChange(e.target.files?.[0] ?? null)}
                  className="hidden"
                />
              </label>
            )}
          </div>
        )}
      </div>

      {/* Summary */}
      <div className="px-5 pt-[18px] pb-1">
        <div className="mb-3 text-[10px] font-semibold tracking-[.14em] text-ink/50 uppercase">
          สรุปยอด · ระบบคำนวณ
        </div>
        <div className="border-t-2 border-b-2 border-divider">
          <div className="flex items-baseline justify-between gap-3.5 border-b border-ink/12 py-[11px]">
            <span className="text-[12.5px] text-ink/60">จำนวนรายการ</span>
            <span className="font-num text-[14px] font-semibold">
              {items.length} รายการ
            </span>
          </div>
          <div className="flex items-baseline justify-between gap-3.5 border-b border-ink/12 py-[11px]">
            <span className="text-[12.5px] text-ink/60">ยอดรวมสินค้า</span>
            <span className="font-num text-[14px] font-semibold">
              {itemsSubtotal ? formatBaht(itemsSubtotal) : "—"}
            </span>
          </div>
          <div className="flex items-baseline justify-between gap-3.5 border-b border-ink/12 py-[11px]">
            <span className="text-[12.5px] text-ink/60">ส่วนลด</span>
            <span className="font-num text-[14px] font-semibold">
              {toNumber(discount) ? `− ${formatBaht(discount)}` : "฿0"}
            </span>
          </div>
          <div className="flex items-baseline justify-between gap-3.5 py-[11px]">
            <span className="text-[12.5px] text-ink/60">ค่าจัดส่ง</span>
            <span className="font-num text-[14px] font-semibold">
              {toNumber(shippingFee) ? `+ ${formatBaht(shippingFee)}` : "฿0"}
            </span>
          </div>
          <div className="flex items-baseline justify-between gap-3.5 py-4">
            <span className="text-[14px] font-bold">ยอดสุทธิ</span>
            <span className={`font-num text-[26px] font-bold ${config.color.text}`}>
              {formatBaht(netTotal)}
            </span>
          </div>
        </div>
        {netTotal < 0 && (
          <div className="mt-2 text-[11.5px] leading-[1.4] text-danger">
            ยอดสุทธิติดลบ — ส่วนลดมากกว่ายอดรวมสินค้ารวมค่าส่ง
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex gap-2.5 px-5 py-3.5">
        <button
          type="button"
          onClick={handleCancel}
          disabled={submitting}
          className="min-h-[52px] border border-divider bg-transparent px-[18px] text-[14px] font-semibold disabled:opacity-60"
        >
          ยกเลิก
        </button>
        <button
          type="button"
          onClick={handleSubmit}
          disabled={submitting}
          className={`flex min-h-[52px] flex-1 items-center justify-center gap-2 px-4 text-[15px] font-semibold text-white disabled:opacity-60 ${config.color.bg}`}
        >
          {submitting
            ? "กำลังบันทึก…"
            : isEditing
              ? config.editSubmitLabel
              : config.submitLabel}
          <Check size={17} className="ml-auto" />
        </button>
      </div>

      {/* Leave-without-saving confirm */}
      {confirmLeaveOpen && (
        <div
          onClick={() => setConfirmLeaveOpen(false)}
          className="fixed inset-0 z-[70] flex items-end justify-center bg-[rgba(10,16,12,0.55)] [animation:fadeIn_0.16s_ease_both]"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-[430px] border-t-2 border-divider bg-surface px-5 pt-6 pb-7 [animation:riseIn_0.2s_ease_both]"
          >
            <h3 className="text-[20px] leading-[1.3] font-bold">
              ยกเลิกบิลนี้?
            </h3>
            <p className="mt-2.5 mb-5 text-[13px] leading-[1.6] text-ink/60">
              ข้อมูลที่กรอกไว้จะหายไปทั้งหมด
            </p>
            <div className="flex gap-2.5">
              <button
                type="button"
                onClick={() => setConfirmLeaveOpen(false)}
                className="min-h-[50px] flex-1 border border-divider bg-transparent text-[14px] font-semibold"
              >
                กรอกต่อ
              </button>
              <button
                type="button"
                onClick={confirmLeave}
                className="min-h-[50px] flex-1 bg-danger text-[14px] font-semibold text-white"
              >
                ยกเลิกบิล
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
