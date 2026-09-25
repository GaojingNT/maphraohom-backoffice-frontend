"use client";

import { useState } from "react";
import { KeyRound } from "lucide-react";
import { changePasswordAction } from "@/app/actions/auth";
import { useToast } from "@/components/toast-provider";

const MIN_PASSWORD_LENGTH = 8;

// Its own card with its own button, separate from the profile form's Save —
// changing the password never rides along with a name/email edit.
export default function ChangePasswordPanel({ email }: { email: string }) {
  const { showToast } = useToast();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | undefined>();
  const [submitting, setSubmitting] = useState(false);

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
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      showToast("เปลี่ยนรหัสผ่านแล้ว");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="mt-2 flex flex-col gap-[18px] border-y-2 border-divider bg-surface p-5"
    >
      <div>
        <div className="text-[10px] leading-none font-semibold tracking-[.18em] text-accent uppercase">
          ความปลอดภัย
        </div>
        <h2 className="mt-2 text-[20px] leading-[1.3] font-bold">
          เปลี่ยนรหัสผ่าน
        </h2>
      </div>

      {/* Hidden username field so password managers file the new password
      under the right account. */}
      <input
        type="email"
        autoComplete="username"
        hidden
        readOnly
        value={email}
      />

      <div>
        <label
          htmlFor="current-password"
          className="mb-2.5 block text-[10px] font-semibold tracking-[.13em] text-ink/55 uppercase"
        >
          รหัสผ่านปัจจุบัน
        </label>
        <input
          id="current-password"
          type="password"
          value={currentPassword}
          onChange={(e) => setCurrentPassword(e.target.value)}
          autoComplete="current-password"
          className="h-12 w-full border border-divider bg-bg px-[13px] text-[15px] outline-none"
        />
      </div>

      <div>
        <label
          htmlFor="new-password"
          className="mb-2.5 block text-[10px] font-semibold tracking-[.13em] text-ink/55 uppercase"
        >
          รหัสผ่านใหม่
        </label>
        <input
          id="new-password"
          type="password"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          autoComplete="new-password"
          minLength={MIN_PASSWORD_LENGTH}
          maxLength={100}
          className="h-12 w-full border border-divider bg-bg px-[13px] text-[15px] outline-none"
        />
        <div className="mt-2 text-[11.5px] leading-[1.4] text-ink/45">
          อย่างน้อย {MIN_PASSWORD_LENGTH} ตัวอักษร
        </div>
      </div>

      <div>
        <label
          htmlFor="confirm-password"
          className="mb-2.5 block text-[10px] font-semibold tracking-[.13em] text-ink/55 uppercase"
        >
          ยืนยันรหัสผ่านใหม่
        </label>
        <input
          id="confirm-password"
          type="password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          autoComplete="new-password"
          maxLength={100}
          className="h-12 w-full border border-divider bg-bg px-[13px] text-[15px] outline-none"
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

      <button
        type="submit"
        disabled={submitting}
        className="flex min-h-[52px] items-center justify-center gap-2 border border-divider bg-transparent px-4 text-[15px] font-semibold disabled:opacity-60"
      >
        {submitting ? "กำลังเปลี่ยนรหัสผ่าน…" : "เปลี่ยนรหัสผ่าน"}
        <KeyRound size={17} className="ml-auto" />
      </button>
    </form>
  );
}
