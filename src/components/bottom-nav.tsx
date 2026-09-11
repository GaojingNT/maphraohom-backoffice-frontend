"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart3, Home, Settings, SquarePlus } from "lucide-react";
import type { ComponentType } from "react";

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
    href: "/create",
    label: "สร้างบิล",
    icon: SquarePlus,
    isActive: (p) => p.startsWith("/create"),
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
  const pathname = usePathname();

  return (
    <div className="fixed inset-x-0 bottom-0 left-1/2 z-40 grid w-full max-w-[430px] -translate-x-1/2 grid-cols-4 border-t-2 border-divider bg-surface pb-[env(safe-area-inset-bottom)]">
      {TABS.map(({ href, label, icon: Icon, isActive }) => {
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
  );
}
