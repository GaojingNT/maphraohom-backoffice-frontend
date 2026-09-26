"use client";

import { useState } from "react";
import { ChevronRight, CircleAlert, KeyRound } from "lucide-react";
import { changePasswordAction } from "@/app/actions/auth";
import { useToast } from "@/components/toast-provider";
import PasswordInput from "@/components/password-input";
import { Dialog } from "@/components/ui/overlay";

const MIN_PASSWORD_LENGTH = 8;

// A "เปลี่ยนรหัสผ่าน" row that opens a dialog. Kept apart from the profile
// form's Save, so a password change never rides along with a name/email
// edit.
export default function ChangePasswordPanel({ email }: { email: string }) {
  const { showToast } = useToast();
  const [open, setOpen] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | undefined>();
  const [submitting, setSubmitting] = useState(false);

  function openDialog() {
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setError(undefined);
    setOpen(true);
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
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={openDialog}
        aria-haspopup="dialog"
        aria-expanded={open}
        className="mk-menurow mt-3 min-h-14! border-t border-line px-0! pt-3! pb-0!"
      >
        <span className="mk-menurow__ic h-9! w-9!">
          <KeyRound size={18} />
        </span>
        <span className="mk-menurow__t">
          <b className="text-[15px]!">เปลี่ยนรหัสผ่าน</b>
        </span>
        <ChevronRight className="mk-billrow__chev" />
      </button>

      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        label="เปลี่ยนรหัสผ่าน"
        busy={submitting}
        role="dialog"
      >
        <form onSubmit={handleSubmit}>
          <h2 className="mk-h2 mb-3">เปลี่ยนรหัสผ่าน</h2>

          {/* Lets password managers file the new password under the right
              account. */}
          <input
            type="email"
            autoComplete="username"
            hidden
            readOnly
            value={email}
          />

          <div className="mk-field">
            <label htmlFor="current-password" className="mk-label">
              รหัสผ่านเดิม
            </label>
            <PasswordInput
              data-autofocus
              id="current-password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              autoComplete="current-password"
            />
          </div>

          <div className="mk-field">
            <label htmlFor="new-password" className="mk-label">
              รหัสผ่านใหม่
            </label>
            <PasswordInput
              id="new-password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              autoComplete="new-password"
              maxLength={100}
            />
            <div className="mk-help">
              อย่างน้อย {MIN_PASSWORD_LENGTH} ตัวอักษร
            </div>
          </div>

          <div className="mk-field">
            <label htmlFor="confirm-password" className="mk-label">
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
            <div role="alert" className="mk-alert mk-alert--error mt-3">
              <CircleAlert />
              <span>{error}</span>
            </div>
          )}

          <div className="mk-actions">
            <button
              type="button"
              onClick={() => setOpen(false)}
              disabled={submitting}
              className="mk-btn mk-btn--outline"
            >
              ยกเลิก
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="mk-btn mk-btn--primary"
            >
              {submitting && <span className="mk-spin" />}
              {submitting ? "กำลังบันทึก…" : "ยืนยัน"}
            </button>
          </div>
        </form>
      </Dialog>
    </>
  );
}
