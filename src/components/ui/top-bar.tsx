import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import type { ReactNode } from "react";

// "‹ กลับ" bar used by every sub-page (spec §3 layout shell).
export default function TopBar({
  backHref,
  backLabel = "กลับ",
  children,
}: {
  backHref: string;
  backLabel?: string;
  children?: ReactNode;
}) {
  return (
    <div className="mk-topbar">
      <Link href={backHref} className="mk-back">
        <ChevronLeft />
        {backLabel}
      </Link>
      {children}
    </div>
  );
}

export function PageHeading({
  eyebrow,
  title,
  eyebrowClassName = "",
}: {
  eyebrow: string;
  title: ReactNode;
  eyebrowClassName?: string;
}) {
  return (
    <div>
      <div className={`mk-eyebrow ${eyebrowClassName}`}>{eyebrow}</div>
      <h1 className="mk-h1 mt-1">{title}</h1>
    </div>
  );
}
