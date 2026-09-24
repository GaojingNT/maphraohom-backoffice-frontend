"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Check, ChevronLeft } from "lucide-react";
import {
  deleteLogo,
  deleteSignature,
  updateStore,
  uploadLogo,
  uploadSignature,
} from "@/lib/api/stores";
import { useToast } from "@/components/toast-provider";
import ImageUploadPanel from "@/components/admin/image-upload-panel";
import type { Store } from "@/lib/types";

export default function StoreEditView({ store: initialStore }: { store: Store }) {
  const router = useRouter();
  const { showToast } = useToast();
  const [store, setStore] = useState(initialStore);
  const [name, setName] = useState(initialStore.name);
  const [address, setAddress] = useState(initialStore.address ?? "");
  const [phone, setPhone] = useState(initialStore.phone ?? "");
  const [nameError, setNameError] = useState<string | undefined>();
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit() {
    if (!name.trim()) {
      setNameError("กรอกชื่อร้าน");
      showToast("กรอกข้อมูลให้ครบก่อนบันทึก");
      return;
    }
    setNameError(undefined);

    setSubmitting(true);
    try {
      const updated = await updateStore(store.id, {
        name: name.trim(),
        address: address.trim(),
        phone: phone.trim(),
      });
      setStore(updated);
      showToast("บันทึกข้อมูลร้านแล้ว");
      router.push("/admin");
    } catch (err) {
      showToast(err instanceof Error ? err.message : "บันทึกไม่สำเร็จ");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex flex-1 flex-col pb-28 [animation:riseIn_0.22s_ease_both]">
      <div className="border-b-2 border-divider bg-surface px-5 pt-4 pb-[18px]">
        <Link
          href="/admin"
          className="flex items-center gap-[7px] py-2.5 pr-2.5 text-[13px] font-semibold text-accent"
        >
          <ChevronLeft size={16} />
          กลับ
        </Link>
        <div className="mt-2 text-[10px] leading-none font-semibold tracking-[.18em] text-accent uppercase">
          ข้อมูลร้านค้า
        </div>
        <h1 className="mt-2.5 text-[26px] leading-[1.25] font-bold">
          {store.name}
        </h1>
      </div>

      <div className="flex flex-col gap-[22px] border-b-2 border-divider bg-surface p-5">
        <div>
          <label className="mb-2.5 block text-[10px] font-semibold tracking-[.13em] text-ink/55 uppercase">
            ชื่อร้าน <span className="text-accent">*</span>
          </label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="ชื่อร้าน"
            className="h-12 w-full border border-divider bg-bg px-[13px] text-[15px] outline-none"
          />
          {nameError && (
            <div className="mt-2 text-[11.5px] leading-[1.4] text-danger">
              {nameError}
            </div>
          )}
        </div>

        <div>
          <label className="mb-2.5 block text-[10px] font-semibold tracking-[.13em] text-ink/55 uppercase">
            ที่อยู่
          </label>
          <textarea
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            rows={2}
            placeholder="บ้านเลขที่ ตำบล อำเภอ จังหวัด"
            className="w-full resize-none border border-divider bg-bg px-[13px] py-3 text-[15px] leading-[1.5] outline-none"
          />
        </div>

        <div>
          <label className="mb-2.5 block text-[10px] font-semibold tracking-[.13em] text-ink/55 uppercase">
            เบอร์โทรศัพท์
          </label>
          <input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            inputMode="tel"
            placeholder="เช่น 0812345678"
            autoComplete="off"
            className="h-12 w-full border border-divider bg-bg px-[13px] text-[15px] outline-none"
          />
        </div>

        <ImageUploadPanel
          label="โลโก้ร้าน"
          imageUrl={store.logo || null}
          onUpload={(file) => uploadLogo(store.id, file)}
          onDelete={() => deleteLogo(store.id)}
          onChange={(logo) => setStore((s) => ({ ...s, logo: logo ?? "" }))}
          emptyLabel="แตะเพื่ออัปโหลดโลโก้"
        />

        <ImageUploadPanel
          label="ลายเซ็น"
          imageUrl={store.signature || null}
          onUpload={(file) => uploadSignature(store.id, file)}
          onDelete={() => deleteSignature(store.id)}
          onChange={(signature) =>
            setStore((s) => ({ ...s, signature: signature ?? "" }))
          }
          emptyLabel="แตะเพื่ออัปโหลดลายเซ็น"
        />
      </div>

      <div className="flex gap-2.5 px-5 py-3.5">
        <Link
          href="/admin"
          className="flex min-h-[52px] items-center border border-divider bg-transparent px-[18px] text-[14px] font-semibold"
        >
          ยกเลิก
        </Link>
        <button
          type="button"
          onClick={handleSubmit}
          disabled={submitting}
          className="flex min-h-[52px] flex-1 items-center justify-center gap-2 bg-accent px-4 text-[15px] font-semibold text-white disabled:opacity-60"
        >
          {submitting ? "กำลังบันทึก…" : "บันทึก"}
          <Check size={17} className="ml-auto" />
        </button>
      </div>
    </div>
  );
}
