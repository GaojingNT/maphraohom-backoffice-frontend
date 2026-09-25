"use client";

import { useState, type ComponentProps } from "react";
import { Eye, EyeOff } from "lucide-react";

// A password field with an eye button that toggles between hidden and
// visible text. Takes every normal <input> prop (name, value/onChange or
// defaultValue, autoComplete, ref, …) except `type`, which it controls.
export default function PasswordInput({
  className = "",
  ...props
}: Omit<ComponentProps<"input">, "type">) {
  const [visible, setVisible] = useState(false);

  return (
    <div className="relative">
      <input
        {...props}
        type={visible ? "text" : "password"}
        // Visible passwords must not be autocorrected/capitalized by mobile
        // keyboards, or what's shown stops matching what's typed.
        autoCapitalize="off"
        autoCorrect="off"
        spellCheck={false}
        className={`h-12 w-full border border-divider bg-bg pr-12 pl-[13px] text-[15px] outline-none ${className}`}
      />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        aria-label={visible ? "ซ่อนรหัสผ่าน" : "แสดงรหัสผ่าน"}
        aria-pressed={visible}
        className="absolute inset-y-0 right-0 flex w-12 items-center justify-center text-ink/45 hover:text-ink/70"
      >
        {visible ? <EyeOff size={18} /> : <Eye size={18} />}
      </button>
    </div>
  );
}
