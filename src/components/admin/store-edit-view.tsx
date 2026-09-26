"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Check, CircleAlert, UserRound } from "lucide-react";
import { deleteLogo, updateStore, uploadLogo } from "@/lib/api/stores";
import { useToast } from "@/components/toast-provider";
import ImageUploadPanel from "@/components/admin/image-upload-panel";
import TopBar, { PageHeading } from "@/components/ui/top-bar";
import type { Store } from "@/lib/types";

export default function StoreEditView({
  store: initialStore,
}: {
  store: Store;
}) {
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
      showToast("กรอกข้อมูลให้ครบก่อนบันทึก", "error");
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
      router.push("/admin/store");
    } catch (err) {
      showToast(
        err instanceof Error ? err.message : "บันทึกไม่สำเร็จ",
        "error",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex flex-1 flex-col pb-28">
      <TopBar backHref="/admin/store" />
      <div className="flex flex-col gap-4 px-4">
        <PageHeading eyebrow="ข้อมูลร้านค้า" title={store.name} />

        <div className="mk-card mk-card__pad">
          <div className={`mk-field ${nameError ? "has-error" : ""}`}>
            <label htmlFor="store-name" className="mk-label">
              ชื่อร้าน <span className="req">*</span>
            </label>
            <input
              id="store-name"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setNameError(undefined);
              }}
              placeholder="ชื่อร้าน"
              className="mk-input"
            />
            {nameError && (
              <div className="mk-err">
                <CircleAlert />
                {nameError}
              </div>
            )}
          </div>

          <div className="mk-field">
            <label htmlFor="store-address" className="mk-label">
              ที่อยู่
            </label>
            <textarea
              id="store-address"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              rows={2}
              placeholder="บ้านเลขที่ ตำบล อำเภอ จังหวัด"
              className="mk-input"
            />
          </div>

          <div className="mk-field">
            <label htmlFor="store-phone" className="mk-label">
              เบอร์โทรศัพท์
            </label>
            <input
              id="store-phone"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              type="tel"
              inputMode="tel"
              placeholder="เช่น 0812345678"
              autoComplete="off"
              className="mk-input num"
            />
          </div>
          <div className="mk-help">
            ชื่อ โลโก้ ที่อยู่ และเบอร์ร้าน จะพิมพ์บนหัวใบเสร็จทุกใบของร้านนี้
          </div>
        </div>

        <div className="mk-grid2">
          <Link
            href="/admin/store"
            className="mk-btn mk-btn--outline mk-btn--lg"
          >
            ยกเลิก
          </Link>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={submitting}
            className="mk-btn mk-btn--primary mk-btn--lg"
          >
            {submitting ? <span className="mk-spin" /> : <Check />}
            {submitting ? "กำลังบันทึก…" : "บันทึก"}
          </button>
        </div>

        <ImageUploadPanel
          label="โลโก้ร้าน"
          imageUrl={store.logo || null}
          onUpload={(file) => uploadLogo(store.id, file)}
          onDelete={() => deleteLogo(store.id)}
          onChange={(logo) => setStore((s) => ({ ...s, logo: logo ?? "" }))}
          emptyLabel="แตะเพื่ออัปโหลดโลโก้"
          deleteBody="หัวใบเสร็จของร้านนี้จะแสดงเฉพาะชื่อร้าน"
          variant="square"
        />

        <div className="mk-card mk-card__pad">
          <h2 className="mk-title mb-2">เจ้าของร้าน</h2>
          {store.owners && store.owners.length > 0 ? (
            <ul className="flex flex-col gap-2.5">
              {store.owners.map((owner) => {
                const fullName = [owner.firstName, owner.lastName]
                  .filter(Boolean)
                  .join(" ");
                return (
                  <li key={owner.id} className="flex items-center gap-3">
                    <span className="mk-menurow__ic h-9! w-9!">
                      <UserRound size={18} />
                    </span>
                    <div className="min-w-0">
                      <div className="truncate font-semibold">
                        {fullName || owner.email}
                      </div>
                      {fullName && (
                        <div className="mk-caption truncate">{owner.email}</div>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="text-[14px] text-ink-muted">ยังไม่มีเจ้าของร้าน</p>
          )}
          <div className="mk-help">แสดงอย่างเดียว</div>
        </div>
      </div>
    </div>
  );
}
