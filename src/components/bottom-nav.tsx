"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { BarChart3, Home, Settings, SquarePlus } from "lucide-react";
import type { ComponentType } from "react";
import BillTypeSheet from "@/components/bills/bill-type-sheet";
import type { BillType } from "@/lib/bill-type";

interface NavTab {
  href: string;
  label: string;
  icon: ComponentType<{ size?: number; strokeWidth?: number }>;
  isActive: (pathname: string) => boolean;
}

const TABS: NavTab[] = [
  {
    href: "/",
    label: "บิล",
    icon: Home,
    isActive: (p) => p === "/" || p.startsWith("/bills"),
  },
  {
    href: "/report",
    label: "รายงาน",
    icon: BarChart3,
    isActive: (p) => p.startsWith("/report"),
  },
  {
    href: "/admin",
    label: "จัดการ",
    icon: Settings,
    isActive: (p) => p.startsWith("/admin"),
  },
];

export default function BottomNav() {
  const router = useRouter();
  const pathname = usePathname();
  const [sheetOpen, setSheetOpen] = useState(false);
  const createButtonRef = useRef<HTMLButtonElement>(null);

  function handleSelectType(type: BillType) {
    setSheetOpen(false);
    router.push(`/create?type=${type}`);
  }

  const createActive = pathname.startsWith("/create");

  return (
    <>
      <div className="fixed inset-x-0 bottom-0 left-1/2 z-40 grid w-full max-w-[430px] -translate-x-1/2 grid-cols-4 border-t-2 border-divider bg-surface pb-[env(safe-area-inset-bottom)]">
        {TABS.slice(0, 1).map(({ href, label, icon: Icon, isActive }) => {
          const active = isActive(pathname);
          return (
            <Link
              key={href}
              href={href}
              className={`-mt-[2px] flex min-h-[66px] flex-col items-center justify-center gap-1.5 border-t-[3px] ${
                active ? "border-accent text-accent" : "border-transparent text-ink/50"
              }`}
            >
              <Icon size={21} strokeWidth={1.9} />
              <span className="text-[10.5px] leading-none font-semibold">
                {label}
              </span>
            </Link>
          );
        })}

        <button
          ref={createButtonRef}
          type="button"
          onClick={() => setSheetOpen(true)}
          aria-haspopup="dialog"
          aria-expanded={sheetOpen}
          className={`-mt-[2px] flex min-h-[66px] flex-col items-center justify-center gap-1.5 border-0 border-t-[3px] bg-transparent ${
            createActive ? "border-accent text-accent" : "border-transparent text-ink/50"
          }`}
        >
          <SquarePlus size={21} strokeWidth={1.9} />
          <span className="text-[10.5px] leading-none font-semibold">
            สร้างบิล
          </span>
        </button>

        {TABS.slice(1).map(({ href, label, icon: Icon, isActive }) => {
          const active = isActive(pathname);
          return (
            <Link
              key={href}
              href={href}
              className={`-mt-[2px] flex min-h-[66px] flex-col items-center justify-center gap-1.5 border-t-[3px] ${
                active ? "border-accent text-accent" : "border-transparent text-ink/50"
              }`}
            >
              <Icon size={21} strokeWidth={1.9} />
              <span className="text-[10.5px] leading-none font-semibold">
                {label}
              </span>
            </Link>
          );
        })}
      </div>

      <BillTypeSheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        onSelect={handleSelectType}
        returnFocusRef={createButtonRef}
      />
    </>
  );
}
