"use client";

import { Check } from "lucide-react";
import PlatformLogo from "@/components/bills/platform-logo";
import type { PlatformType } from "@/lib/types";

// One tap target per platform (logo + name), sized for thumbs. Tapping the
// selected one again clears it — the platform is optional.
export default function PlatformPicker({
  platforms,
  value,
  onChange,
}: {
  platforms: PlatformType[];
  value: number | null;
  onChange: (id: number | null) => void;
}) {
  return (
    <div className="mk-platforms" role="group" aria-label="ช่องทางการขาย">
      {platforms.map((p) => {
        const selected = value === p.id;
        return (
          <button
            key={p.id}
            type="button"
            className="mk-platform"
            aria-pressed={selected}
            onClick={() => onChange(selected ? null : p.id)}
          >
            {selected && (
              <span className="mk-platform__check" aria-hidden>
                <Check strokeWidth={3} />
              </span>
            )}
            <PlatformLogo platform={p} size={36} />
            <span className="mk-platform__name">{p.name}</span>
          </button>
        );
      })}
    </div>
  );
}
