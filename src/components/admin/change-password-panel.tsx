"use client";

import { useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ChevronRight, KeyRound } from "lucide-react";
import { changePasswordAction } from "@/app/actions/auth";
import { useToast } from "@/components/toast-provider";
import PasswordInput from "@/components/password-input";

const MIN_PASSWORD_LENGTH = 8;

// A "เปลี่ยนรหัสผ่าน" row that opens a bottom-sheet dialog (same look as the
// app's other confirm sheets). Kept apart from the profile form's Save, so a
// password change never rides along with a name/email edit.
export default function ChangePasswordPanel({ email }: { email: string }) {
  const { showToast } = useToast();
  const [open, setOpen] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | undefined>();
  const [submitting, setSubmitting] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);

  function openDialog() {
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setError(undefined);
    setOpen(true);
  }

  function closeDialog() {
    if (submitting) return;
    setOpen(false);
    triggerRef.current?.focus();
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (!currentPassword || !newPassword || !confirmPassword) {
      setError("กรอกรหัสผ่านให้ครบทั้ง 3 ช่อง");
      return;
    }
    if (newPassword.length < MIN_PASSWORD_LENGTH) {
      setError(`รหัสผ่านใหม่ต้องมีอย่างน้อย ${MIN_PASSWORD_LENGTH} ตัวอักษร`);
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("รหัสผ่านใหม่กับยืนยันรหัสผ่านไม่ตรงกัน");
      return;
    }
    if (newPassword === currentPassword) {
      setError("รหัสผ่านใหม่ต้องไม่ซ้ำกับรหัสผ่านปัจจุบัน");
      return;
    }
    setError(undefined);

    setSubmitting(true);
    try {
      const result = await changePasswordAction({
        currentPassword,
        newPassword,
        confirmPassword,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setOpen(false);
      showToast("เปลี่ยนรหัสผ่านแล้ว");
      triggerRef.current?.focus();
    } finally {
      setSubmitting(false);
    }
  }

  const labelClass =
    "mb-2.5 block text-[10px] font-semibold tracking-[.13em] text-ink/55 uppercase";

  return (
    <>
      <div>
        <div className={labelClass}>รหัสผ่าน</div>
        <button
          ref={triggerRef}
          type="button"
          onClick={openDialog}
          aria-haspopup="dialog"
          aria-expanded={open}
          className="flex min-h-12 w-full items-center gap-3 border border-divider bg-bg px-[13px] text-left text-[14px] font-semibold"
        >
          <KeyRound size={17} className="flex-none text-ink/45" />
          <span className="flex-1">เปลี่ยนรหัสผ่าน</span>
          <ChevronRight size={16} className="flex-none text-ink/35" />
        </button>
      </div>

      {/* Portaled to <body>: the edit page's wrapper animates with a
      transform, which would otherwise trap this fixed overlay inside the
      page column and under the (fixed) bottom nav. */}
      {open &&
        createPortal(
          <div
            onClick={closeDialog}
            onKeyDown={(e) => {
              if (e.key === "Escape") closeDialog();
            }}
            className="fixed inset-0 z-[70] flex items-end justify-center bg-[rgba(10,16,12,0.55)] [animation:fadeIn_0.16s_ease_both]"
          >
            <form
              role="dialog"
              aria-modal="true"
              aria-labelledby="change-password-title"
              onClick={(e) => e.stopPropagation()}
              onSubmit={handleSubmit}
              className="flex max-h-[92dvh] w-full max-w-[430px] flex-col gap-[18px] overflow-y-auto border-t-2 border-divider bg-surface px-5 pt-6 pb-[calc(28px+env(safe-area-inset-bottom))] [animation:riseIn_0.2s_ease_both]"
            >
              <h3
                id="change-password-title"
                className="text-[20px] leading-[1.3] font-bold"
              >
                เปลี่ยนรหัสผ่าน
              </h3>

              {/* Lets password managers file the new password under the
              right account. */}
              <input
                type="email"
                autoComplete="username"
                hidden
                readOnly
                value={email}
              />

              <div>
                <label htmlFor="current-password" className={labelClass}>
                  รหัสผ่านเดิม
                </label>
                <PasswordInput
                  autoFocus
                  id="current-password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  autoComplete="current-password"
                />
              </div>

              <div>
                <label htmlFor="new-password" className={labelClass}>
                  รหัสผ่านใหม่
                </label>
                <PasswordInput
                  id="new-password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  autoComplete="new-password"
                  maxLength={100}
                />
                <div className="mt-2 text-[11.5px] leading-[1.4] text-ink/45">
                  อย่างน้อย {MIN_PASSWORD_LENGTH} ตัวอักษร
                </div>
              </div>

              <div>
                <label htmlFor="confirm-password" className={labelClass}>
                  ยืนยันรหัสผ่านใหม่
                </label>
                <PasswordInput
                  id="confirm-password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  autoComplete="new-password"
                  maxLength={100}
                />
              </div>

              {error && (
                <div
                  role="alert"
                  className="border border-danger/40 bg-danger/5 px-[13px] py-2.5 text-[13px] leading-[1.5] text-danger"
                >
                  {error}
                </div>
              )}

              <div className="flex gap-2.5 pt-1">
                <button
                  type="button"
                  onClick={closeDialog}
                  disabled={submitting}
                  className="min-h-[50px] flex-1 border border-divider bg-transparent text-[14px] font-semibold disabled:opacity-60"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="min-h-[50px] flex-1 bg-accent text-[14px] font-semibold text-white disabled:opacity-60"
                >
                  {submitting ? "กำลังบันทึก…" : "ยืนยัน"}
                </button>
              </div>
            </form>
          </div>,
          document.body,
        )}
    </>
  );
}
