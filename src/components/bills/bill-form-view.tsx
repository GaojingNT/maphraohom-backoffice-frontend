"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Check,
  ChevronDown,
  Package,
  Plus,
  Trash2,
  Upload,
} from "lucide-react";
import { createBill, updateBill } from "@/lib/api/bills";
import {
  getCustomerAddresses,
  getCustomerPhones,
  searchCustomers,
  type CustomerListItem,
} from "@/lib/api/customers";
import { getStoreProducts } from "@/lib/api/stores";
import { formatBaht, formatKg } from "@/lib/format";
import { slipUrl } from "@/lib/slip-url";
import { useToast } from "@/components/toast-provider";
import type { Bill, Store, StoreProductPrice } from "@/lib/types";

interface FormItem {
  key: string;
  productId: number | null;
  kilogram: string;
}

interface FormErrors {
  storeId?: string;
  customerName?: string;
  customerAddress?: string;
  itemsList?: string;
  items: Record<string, string>;
}

type SlipState =
  | { kind: "none" }
  | { kind: "existing"; key: string }
  | { kind: "new"; file: File; previewUrl: string };

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
  return { key: `i${itemKeySeq++}`, productId: null, kilogram: "" };
}

export default function BillFormView({
  stores,
  editingBill,
  initialProducts,
}: {
  stores: Store[];
  editingBill?: Bill;
  initialProducts?: StoreProductPrice[];
}) {
  const router = useRouter();
  const { showToast } = useToast();
  const isEditing = !!editingBill;

  const [storeId, setStoreId] = useState<number | null>(
    editingBill?.storeId ?? null,
  );
  const [products, setProducts] = useState<StoreProductPrice[]>(
    () => initialProducts ?? [],
  );
  const [productsLoading, setProductsLoading] = useState(false);
  const [items, setItems] = useState<FormItem[]>(() =>
    editingBill
      ? editingBill.items.map((it) => ({
          key: `i${itemKeySeq++}`,
          productId: it.productId,
          kilogram: String(it.kilogram),
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
  const [discount, setDiscount] = useState(
    editingBill?.discount ? String(editingBill.discount) : "",
  );
  const [shippingFee, setShippingFee] = useState(
    editingBill?.shippingFee ? String(editingBill.shippingFee) : "",
  );
  const [slipState, setSlipState] = useState<SlipState>(() =>
    editingBill?.slip
      ? { kind: "existing", key: editingBill.slip }
      : { kind: "none" },
  );
  const [errors, setErrors] = useState<FormErrors>(emptyErrors());
  const [submitting, setSubmitting] = useState(false);

  const [customerSuggestions, setCustomerSuggestions] = useState<
    CustomerListItem[]
  >([]);
  const [showCustomerSuggestions, setShowCustomerSuggestions] = useState(false);

  // Debounced customer-name search. The `if (...) return;` guards below
  // never call setState directly — only the resolved fetch callback does —
  // so this stays compliant with react-hooks/set-state-in-effect while
  // still reacting to customerName changes as the user types.
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

  // Revoke the slip preview URL whenever it's replaced or the form unmounts.
  // This effect only touches the external object-URL registry — it never
  // calls setState — so the fetch-on-select-change below is handled
  // directly in its event handler instead of an effect.
  useEffect(() => {
    return () => {
      if (slipState.kind === "new") URL.revokeObjectURL(slipState.previewUrl);
    };
  }, [slipState]);

  async function handleStoreChange(value: string) {
    const nextStoreId = value ? Number(value) : null;
    setStoreId(nextStoreId);
    setProducts([]);
    if (nextStoreId == null) return;

    setProductsLoading(true);
    try {
      const data = await getStoreProducts(nextStoreId);
      setProducts(data);
    } catch {
      setProducts([]);
    } finally {
      setProductsLoading(false);
    }
  }

  function handleCustomerNameChange(value: string) {
    setCustomerName(value);
    setShowCustomerSuggestions(!!value.trim());
  }

  async function handleSelectCustomer(customer: CustomerListItem) {
    setCustomerName(customer.name);
    setShowCustomerSuggestions(false);
    setCustomerSuggestions([]);
    try {
      const [addresses, phones] = await Promise.all([
        getCustomerAddresses(customer.id),
        getCustomerPhones(customer.id),
      ]);
      if (addresses.length > 0) setCustomerAddress(addresses[0].address);
      if (phones.length > 0) setCustomerPhone(phones[0].phone);
    } catch {
      // Address/phone stay editable manually either way.
    }
  }

  function handleSlipChange(file: File | null) {
    if (!file) {
      setSlipState({ kind: "none" });
      return;
    }
    setSlipState({ kind: "new", file, previewUrl: URL.createObjectURL(file) });
  }

  function clearSlip() {
    setSlipState({ kind: "none" });
  }

  function updateItemProduct(key: string, productId: number | null) {
    setItems((prev) =>
      prev.map((it) => (it.key === key ? { ...it, productId } : it)),
    );
  }
  function updateItemKilogram(key: string, raw: string) {
    const kilogram = sanitizeNumberInput(raw);
    setItems((prev) =>
      prev.map((it) => (it.key === key ? { ...it, kilogram } : it)),
    );
  }
  function addItem() {
    setItems((prev) => [...prev, createFormItem()]);
  }
  function removeItem(key: string) {
    setItems((prev) => prev.filter((it) => it.key !== key));
  }

  function resetForm() {
    setStoreId(null);
    setProducts([]);
    setItems([createFormItem()]);
    setCustomerName("");
    setCustomerAddress("");
    setCustomerPhone("");
    setShowCustomerSuggestions(false);
    setCustomerSuggestions([]);
    setDiscount("");
    setShippingFee("");
    clearSlip();
    setErrors(emptyErrors());
  }

  const itemsComputed = items.map((it) => {
    const price = products.find((p) => p.productId === it.productId)?.price;
    const kg = parseFloat(it.kilogram) || 0;
    const subtotal = price ? kg * price : 0;
    return { ...it, price: price ?? null, kg, subtotal };
  });
  const kgTotal = itemsComputed.reduce((a, it) => a + it.kg, 0);
  const itemsSubtotal = itemsComputed.reduce((a, it) => a + it.subtotal, 0);
  const discountNum = parseFloat(discount) || 0;
  const shippingNum = parseFloat(shippingFee) || 0;
  const netTotal = Math.max(0, itemsSubtotal - discountNum + shippingNum);

  function validate(): FormErrors {
    const next = emptyErrors();
    if (storeId == null) next.storeId = "เลือกสาขาก่อน";
    if (!customerName.trim()) next.customerName = "กรอกชื่อลูกค้า";
    if (!customerAddress.trim()) next.customerAddress = "กรอกที่อยู่จัดส่ง";
    if (items.length === 0) next.itemsList = "ต้องมีสินค้าอย่างน้อย 1 รายการ";
    items.forEach((it) => {
      if (!it.productId) next.items[it.key] = "เลือกสินค้าของรายการนี้";
      else if (!(parseFloat(it.kilogram) > 0))
        next.items[it.key] = "น้ำหนักต้องมากกว่า 0";
    });
    return next;
  }

  function handleCancel() {
    if (editingBill) router.push(`/bills/${editingBill.id}`);
    else resetForm();
  }

  async function handleSubmit() {
    const nextErrors = validate();
    setErrors(nextErrors);
    if (hasErrors(nextErrors)) {
      showToast("กรอกข้อมูลให้ครบก่อนบันทึก");
      return;
    }

    const baseInput = {
      storeId: storeId!,
      customerName: customerName.trim(),
      customerAddress: customerAddress.trim(),
      customerPhone: customerPhone.trim(),
      items: items.map((it) => ({
        productId: it.productId!,
        kilogram: parseFloat(it.kilogram),
      })),
      discount: discountNum,
      shippingFee: shippingNum,
      slip: slipState.kind === "new" ? slipState.file : null,
    };

    setSubmitting(true);
    try {
      if (editingBill) {
        const bill = await updateBill(editingBill.id, {
          ...baseInput,
          removeSlip: slipState.kind === "none" && !!editingBill.slip,
        });
        showToast("แก้ไขบิลเรียบร้อย");
        router.push(`/bills/${bill.id}`);
      } else {
        const bill = await createBill(baseInput);
        showToast(`บันทึกบิล ${bill.receiptNo} แล้ว`);
        router.push(`/bills/${bill.id}`);
      }
    } catch (err) {
      showToast(err instanceof Error ? err.message : "บันทึกบิลไม่สำเร็จ");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex flex-1 flex-col pb-28">
      <div className="border-b-2 border-divider px-5 pt-[26px] pb-4">
        <div className="text-[10px] leading-none font-semibold tracking-[.18em] text-accent uppercase">
          {isEditing ? "แก้ไขบิล" : "สร้างบิลใหม่"}
        </div>
        <h1 className="mt-2.5 text-[30px] leading-[1.15] font-bold tracking-[-.01em]">
          {isEditing ? "แก้ไขบิล" : "ออกบิลใหม่"}
        </h1>
        <p className="mt-2 text-[12.5px] leading-[1.6] text-ink/55">
          เลขเล่ม เลขที่ใบเสร็จ และราคาต่อกิโล ระบบดึงและคำนวณให้เอง
        </p>
      </div>

      <div className="flex flex-col gap-[22px] border-b-2 border-divider bg-surface p-5">
        {/* 1. Store */}
        <div>
          <label className="mb-2.5 block text-[10px] font-semibold tracking-[.13em] text-ink/55 uppercase">
            1 · สาขา <span className="text-accent">*</span>
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
            แต่ละสาขามีราคาต่อกิโลไม่เท่ากัน — เลือกสาขาก่อนจึงเลือกสินค้าได้
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
              2 · รายการสินค้า <span className="text-accent">*</span>
            </label>
            <span className="font-num text-[10.5px] text-ink/50">
              {items.length} รายการ · {formatKg(kgTotal)}
            </span>
          </div>

          {storeId == null ? (
            <div className="flex items-center gap-3 border border-dashed border-divider px-4 py-[22px] text-ink/45">
              <Package size={20} strokeWidth={1.7} className="flex-none" />
              <span className="text-[12.5px] leading-[1.45] font-semibold">
                เลือกสาขาด้านบนก่อน ระบบจะดึงราคาสินค้าของสาขานั้นมาให้
              </span>
            </div>
          ) : (
            <>
              <div className="flex flex-col gap-3">
                {itemsComputed.map((it, idx) => (
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
                        disabled={productsLoading}
                        onChange={(e) =>
                          updateItemProduct(
                            it.key,
                            e.target.value ? Number(e.target.value) : null,
                          )
                        }
                        className="h-12 w-full cursor-pointer appearance-none border-0 bg-transparent px-[13px] pr-10 text-[13.5px] font-semibold outline-none"
                      >
                        <option value="">
                          {productsLoading
                            ? "กำลังโหลดสินค้า…"
                            : "— เลือกสินค้า —"}
                        </option>
                        {products.map((p) => (
                          <option key={p.productId} value={p.productId}>
                            {p.productName} — {formatBaht(p.price)}/กก.
                          </option>
                        ))}
                      </select>
                      <ChevronDown
                        size={14}
                        strokeWidth={2.2}
                        className="pointer-events-none absolute top-[17px] right-3.5 text-ink/50"
                      />
                    </div>
                    <div className="grid grid-cols-[1fr_auto] items-stretch">
                      <div className="flex items-center border-r border-ink/12">
                        <input
                          value={it.kilogram}
                          onChange={(e) =>
                            updateItemKilogram(it.key, e.target.value)
                          }
                          inputMode="decimal"
                          placeholder="0"
                          className="font-num h-12 min-w-0 flex-1 border-0 bg-transparent px-[13px] text-[16px] font-bold outline-none"
                        />
                        <span className="px-3 text-[11.5px] font-semibold text-ink/50">
                          กก. × {it.price != null ? formatBaht(it.price) : "฿—"}
                        </span>
                      </div>
                      <div className="font-num flex items-center px-[13px] text-[14.5px] font-bold whitespace-nowrap text-accent">
                        {it.subtotal ? formatBaht(it.subtotal) : "฿0"}
                      </div>
                    </div>
                    {errors.items[it.key] && (
                      <div className="border-t border-ink/12 px-[13px] py-[9px] text-[11.5px] leading-[1.4] text-danger">
                        {errors.items[it.key]}
                      </div>
                    )}
                  </div>
                ))}
              </div>
              <button
                type="button"
                onClick={addItem}
                className="mt-3 flex min-h-12 w-full items-center gap-[9px] border border-accent bg-accent-100 px-3.5 text-[13px] font-semibold text-accent hover:bg-accent-200"
              >
                <Plus size={16} strokeWidth={2.2} />
                เพิ่มสินค้าอีกรายการ
              </button>
            </>
          )}
          {errors.itemsList && (
            <div className="mt-2 text-[11.5px] leading-[1.4] text-danger">
              {errors.itemsList}
            </div>
          )}
        </div>

        {/* 3. Customer name */}
        <div className="relative">
          <label className="mb-2.5 block text-[10px] font-semibold tracking-[.13em] text-ink/55 uppercase">
            3 · ชื่อลูกค้า <span className="text-accent">*</span>
          </label>
          <input
            value={customerName}
            onChange={(e) => handleCustomerNameChange(e.target.value)}
            onFocus={() => setShowCustomerSuggestions(!!customerName.trim())}
            onBlur={() => setShowCustomerSuggestions(false)}
            placeholder="เช่น ร้านขนมป้ามาลี"
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
            4 · ที่อยู่จัดส่ง <span className="text-accent">*</span>
          </label>
          <textarea
            value={customerAddress}
            onChange={(e) => setCustomerAddress(e.target.value)}
            rows={2}
            placeholder="บ้านเลขที่ ตำบล อำเภอ จังหวัด"
            className="w-full resize-none border border-divider bg-bg px-[13px] py-3 text-[15px] leading-[1.5] outline-none"
          />
          {errors.customerAddress && (
            <div className="mt-2 text-[11.5px] leading-[1.4] text-danger">
              {errors.customerAddress}
            </div>
          )}
        </div>

        {/* 5. Phone */}
        <div>
          <label className="mb-2.5 block text-[10px] font-semibold tracking-[.13em] text-ink/55 uppercase">
            5 · เบอร์โทรศัพท์
          </label>
          <input
            value={customerPhone}
            onChange={(e) => setCustomerPhone(e.target.value)}
            inputMode="tel"
            placeholder="เช่น 0812345678"
            autoComplete="off"
            className="h-12 w-full border border-divider bg-bg px-[13px] text-[15px] outline-none"
          />
        </div>

        {/* Discount / shipping */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-2.5 block text-[10px] font-semibold tracking-[.13em] text-ink/55 uppercase">
              ส่วนลด
            </label>
            <input
              value={discount}
              onChange={(e) => setDiscount(sanitizeNumberInput(e.target.value))}
              inputMode="decimal"
              placeholder="0"
              className="h-12 w-full border border-divider bg-bg px-[13px] text-[15px] outline-none"
            />
          </div>
          <div>
            <label className="mb-2.5 block text-[10px] font-semibold tracking-[.13em] text-ink/55 uppercase">
              ค่าส่ง
            </label>
            <input
              value={shippingFee}
              onChange={(e) =>
                setShippingFee(sanitizeNumberInput(e.target.value))
              }
              inputMode="decimal"
              placeholder="0"
              className="h-12 w-full border border-divider bg-bg px-[13px] text-[15px] outline-none"
            />
          </div>
        </div>

        {/* Slip */}
        <div>
          <label className="mb-2.5 block text-[10px] font-semibold tracking-[.13em] text-ink/55 uppercase">
            สลิปโอนเงิน
          </label>
          {slipState.kind !== "none" ? (
            <div className="flex items-stretch gap-3 border border-divider bg-bg p-2.5">
              <div
                className="h-[74px] w-[74px] flex-none border border-ink/15 bg-cover bg-center"
                style={{
                  backgroundImage: `url("${
                    slipState.kind === "new"
                      ? slipState.previewUrl
                      : slipUrl(slipState.key)
                  }")`,
                }}
              />
              <div className="flex min-w-0 flex-1 flex-col justify-center gap-2">
                <div className="truncate text-[12.5px] leading-[1.35] font-semibold">
                  {slipState.kind === "new" ? slipState.file.name : "สลิปเดิม"}
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
              <Upload size={20} strokeWidth={1.8} className="text-accent" />
              <span className="text-[13px] font-semibold text-ink/60">
                แนบรูปสลิป (ไม่บังคับ)
              </span>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => handleSlipChange(e.target.files?.[0] ?? null)}
                className="hidden"
              />
            </label>
          )}
        </div>
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
            <span className="text-[12.5px] text-ink/60">น้ำหนักรวม</span>
            <span className="font-num text-[14px] font-semibold">
              {formatKg(kgTotal)}
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
              {discountNum ? `− ${formatBaht(discountNum)}` : "฿0"}
            </span>
          </div>
          <div className="flex items-baseline justify-between gap-3.5 py-[11px]">
            <span className="text-[12.5px] text-ink/60">ค่าจัดส่ง</span>
            <span className="font-num text-[14px] font-semibold">
              {shippingNum ? `+ ${formatBaht(shippingNum)}` : "฿0"}
            </span>
          </div>
          <div className="flex items-baseline justify-between gap-3.5 py-4">
            <span className="text-[14px] font-bold">ยอดสุทธิ</span>
            <span className="font-num text-[26px] font-bold text-accent">
              {formatBaht(netTotal)}
            </span>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-2.5 px-5 py-3.5">
        <button
          type="button"
          onClick={handleCancel}
          disabled={submitting}
          className="min-h-[52px] border border-divider bg-transparent px-[18px] text-[14px] font-semibold disabled:opacity-60"
        >
          {isEditing ? "ยกเลิก" : "ล้าง"}
        </button>
        <button
          type="button"
          onClick={handleSubmit}
          disabled={submitting}
          className="flex min-h-[52px] flex-1 items-center justify-center gap-2 bg-accent px-4 text-[15px] font-semibold text-white disabled:opacity-60"
        >
          {submitting
            ? "กำลังบันทึก…"
            : isEditing
              ? "บันทึกการแก้ไข"
              : "บันทึกบิล"}
          <Check size={17} className="ml-auto" />
        </button>
      </div>
    </div>
  );
}
