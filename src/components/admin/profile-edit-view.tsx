"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Check, ChevronLeft } from "lucide-react";
import {
  deleteSignatureAction,
  updateProfileAction,
  uploadSignatureAction,
} from "@/app/actions/auth";
import { useToast } from "@/components/toast-provider";
import ImageUploadPanel from "@/components/admin/image-upload-panel";
import type { Profile } from "@/lib/types";

// Loose on purpose — the backend's validator is the real check; this only
// catches obvious typos before a round-trip.
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// ImageUploadPanel expects throwing callbacks; the Server Actions return
// { ok, error } instead (see app/actions/auth.ts), so adapt them here.
async function uploadSignature(file: File): Promise<string> {
  const form = new FormData();
  form.set("signature", file);
  const result = await uploadSignatureAction(form);
  if (!result.ok) throw new Error(result.error);
  return result.data;
}

async function deleteSignature(): Promise<void> {
  const result = await deleteSignatureAction();
  if (!result.ok) throw new Error(result.error);
}

export default function ProfileEditView({ profile }: { profile: Profile }) {
  const router = useRouter();
  const { showToast } = useToast();
  const [firstName, setFirstName] = useState(profile.firstName);
  const [lastName, setLastName] = useState(profile.lastName);
  const [email, setEmail] = useState(profile.email);
  const [signature, setSignature] = useState(profile.signature);
  const [emailError, setEmailError] = useState<string | undefined>();
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit() {
    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      setEmailError("กรอกอีเมล");
      showToast("กรอกข้อมูลให้ครบก่อนบันทึก");
      return;
    }
    if (!EMAIL_PATTERN.test(trimmedEmail)) {
      setEmailError("รูปแบบอีเมลไม่ถูกต้อง");
      showToast("กรอกข้อมูลให้ถูกต้องก่อนบันทึก");
      return;
    }
    setEmailError(undefined);

    setSubmitting(true);
    try {
      const result = await updateProfileAction({
        firstName,
        lastName,
        email: trimmedEmail,
      });
      if (!result.ok) {
        showToast(result.error);
        return;
      }
      showToast("บันทึกโปรไฟล์แล้ว");
      router.push("/admin/profile");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex flex-1 flex-col pb-28 [animation:riseIn_0.22s_ease_both]">
      <div className="border-b-2 border-divider bg-surface px-5 pt-4 pb-[18px]">
        <Link
          href="/admin/profile"
          className="flex items-center gap-[7px] py-2.5 pr-2.5 text-[13px] font-semibold text-accent"
        >
          <ChevronLeft size={16} />
          กลับ
        </Link>
        <div className="mt-2 text-[10px] leading-none font-semibold tracking-[.18em] text-accent uppercase">
          โปรไฟล์
        </div>
        <h1 className="mt-2.5 text-[26px] leading-[1.25] font-bold">
          แก้ไขโปรไฟล์
        </h1>
      </div>

      <div className="flex flex-col gap-[22px] border-b-2 border-divider bg-surface p-5">
        <div>
          <label
            htmlFor="profile-first-name"
            className="mb-2.5 block text-[10px] font-semibold tracking-[.13em] text-ink/55 uppercase"
          >
            ชื่อ
          </label>
          <input
            id="profile-first-name"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            placeholder="ชื่อ"
            autoComplete="given-name"
            maxLength={100}
            className="h-12 w-full border border-divider bg-bg px-[13px] text-[15px] outline-none"
          />
        </div>

        <div>
          <label
            htmlFor="profile-last-name"
            className="mb-2.5 block text-[10px] font-semibold tracking-[.13em] text-ink/55 uppercase"
          >
            นามสกุล
          </label>
          <input
            id="profile-last-name"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            placeholder="นามสกุล"
            autoComplete="family-name"
            maxLength={100}
            className="h-12 w-full border border-divider bg-bg px-[13px] text-[15px] outline-none"
          />
        </div>

        <div>
          <label
            htmlFor="profile-email"
            className="mb-2.5 block text-[10px] font-semibold tracking-[.13em] text-ink/55 uppercase"
          >
            อีเมล <span className="text-accent">*</span>
          </label>
          <input
            id="profile-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="name@example.com"
            autoComplete="email"
            inputMode="email"
            maxLength={100}
            className="h-12 w-full border border-divider bg-bg px-[13px] text-[15px] outline-none"
          />
          {emailError ? (
            <div className="mt-2 text-[11.5px] leading-[1.4] text-danger">
              {emailError}
            </div>
          ) : (
            <div className="mt-2 text-[11.5px] leading-[1.4] text-ink/45">
              ใช้อีเมลนี้เข้าสู่ระบบ
            </div>
          )}
        </div>

        <div>
          <ImageUploadPanel
            label="ลายเซ็น"
            imageUrl={signature || null}
            onUpload={uploadSignature}
            onDelete={deleteSignature}
            onChange={(url) => setSignature(url ?? "")}
            emptyLabel="แตะเพื่ออัปโหลดลายเซ็น"
          />
          <div className="mt-2 text-[11.5px] leading-[1.4] text-ink/45">
            ใช้พิมพ์บนใบเสร็จ/ใบสำคัญจ่ายทุกใบที่คุณส่งออก
          </div>
        </div>
      </div>

      <div className="flex gap-2.5 px-5 py-3.5">
        <Link
          href="/admin/profile"
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
