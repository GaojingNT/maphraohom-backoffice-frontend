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
    <div className="mk-input-wrap">
      <input
        {...props}
        type={visible ? "text" : "password"}
        // Visible passwords must not be autocorrected/capitalized by mobile
        // keyboards, or what's shown stops matching what's typed.
        autoCapitalize="off"
        autoCorrect="off"
        spellCheck={false}
        className={`mk-input ${className}`}
      />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        aria-label={visible ? "ซ่อนรหัสผ่าน" : "แสดงรหัสผ่าน"}
        aria-pressed={visible}
        className="mk-affix"
      >
        {visible ? <EyeOff size={20} /> : <Eye size={20} />}
      </button>
    </div>
  );
}
