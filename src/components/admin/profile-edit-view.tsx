"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Check, CircleAlert } from "lucide-react";
import {
  deleteSignatureAction,
  updateProfileAction,
  uploadSignatureAction,
} from "@/app/actions/auth";
import { useToast } from "@/components/toast-provider";
import ImageUploadPanel from "@/components/admin/image-upload-panel";
import ChangePasswordPanel from "@/components/admin/change-password-panel";
import TopBar, { PageHeading } from "@/components/ui/top-bar";
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
      showToast("กรอกข้อมูลให้ครบก่อนบันทึก", "error");
      return;
    }
    if (!EMAIL_PATTERN.test(trimmedEmail)) {
      setEmailError("รูปแบบอีเมลไม่ถูกต้อง");
      showToast("กรอกข้อมูลให้ถูกต้องก่อนบันทึก", "error");
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
        showToast(result.error, "error");
        return;
      }
      showToast("บันทึกโปรไฟล์แล้ว");
      router.push("/admin/profile");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex flex-1 flex-col pb-28">
      <TopBar backHref="/admin/profile" />
      <div className="flex flex-col gap-4 px-4">
        <PageHeading eyebrow="โปรไฟล์" title="แก้ไขโปรไฟล์" />

        <div className="mk-card mk-card__pad">
          <div className="mk-grid2">
            <div className="mk-field">
              <label htmlFor="profile-first-name" className="mk-label">
                ชื่อ
              </label>
              <input
                id="profile-first-name"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="ชื่อ"
                autoComplete="given-name"
                maxLength={100}
                className="mk-input"
              />
            </div>
            <div className="mk-field">
              <label htmlFor="profile-last-name" className="mk-label">
                นามสกุล
              </label>
              <input
                id="profile-last-name"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="นามสกุล"
                autoComplete="family-name"
                maxLength={100}
                className="mk-input"
              />
            </div>
          </div>

          <div className={`mk-field mt-4 ${emailError ? "has-error" : ""}`}>
            <label htmlFor="profile-email" className="mk-label">
              อีเมล <span className="req">*</span>
            </label>
            <input
              id="profile-email"
              type="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                setEmailError(undefined);
              }}
              placeholder="name@example.com"
              autoComplete="email"
              inputMode="email"
              maxLength={100}
              className="mk-input"
            />
            {emailError && (
              <div className="mk-err">
                <CircleAlert />
                {emailError}
              </div>
            )}
            <div className="mk-help">ใช้อีเมลนี้เข้าสู่ระบบ</div>
          </div>

          <ChangePasswordPanel email={profile.email} />
        </div>

        <div className="mk-grid2">
          <Link
            href="/admin/profile"
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

        {/* Saves on its own — kept out of the form above so "ยกเลิก" is never
            mistaken for undoing a signature change. */}
        <ImageUploadPanel
          label="ลายเซ็น"
          imageUrl={signature || null}
          onUpload={uploadSignature}
          onDelete={deleteSignature}
          onChange={(url) => setSignature(url ?? "")}
          emptyLabel="แตะเพื่ออัปโหลดลายเซ็น"
          deleteBody="ใบเสร็จที่ส่งออกหลังจากนี้จะเว้นช่องลายเซ็นว่างไว้"
          helper="ใช้พิมพ์บนใบเสร็จ/ใบสำคัญจ่ายทุกใบที่คุณส่งออก"
        />
      </div>
    </div>
  );
}
