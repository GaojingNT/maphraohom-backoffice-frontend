"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { BarChart3, Plus, ReceiptText, SlidersHorizontal } from "lucide-react";
import BillTypeSheet from "@/components/bills/bill-type-sheet";
import type { BillType } from "@/lib/bill-type";

// Form screens show their own sticky footer (net total + save) instead of
// the nav, so the two bars never stack.
function isFormScreen(pathname: string) {
  return (
    pathname.startsWith("/create") || /^\/bills\/[^/]+\/edit/.test(pathname)
  );
}

export default function BottomNav() {
  const router = useRouter();
  const pathname = usePathname();
  const [sheetOpen, setSheetOpen] = useState(false);

  function handleSelectType(type: BillType) {
    setSheetOpen(false);
    router.push(`/create?type=${type}`);
  }

  if (isFormScreen(pathname)) return null;

  const billsActive = pathname === "/" || pathname.startsWith("/bills");
  const reportActive = pathname.startsWith("/report");
  const adminActive = pathname.startsWith("/admin");

  return (
    <>
      <nav
        aria-label="เมนูหลัก"
        className="mk mk-nav fixed bottom-0 left-1/2 z-40 w-full max-w-[430px] -translate-x-1/2"
      >
        <Link href="/" aria-current={billsActive ? "page" : undefined}>
          <span className="mk-nav__pill">
            <ReceiptText />
          </span>
          บิล
        </Link>
        <button
          type="button"
          className="mk-nav__create"
          onClick={() => setSheetOpen(true)}
          aria-haspopup="dialog"
          aria-expanded={sheetOpen}
        >
          <span className="mk-nav__pill">
            <Plus strokeWidth={2.4} />
          </span>
          สร้างบิล
        </button>
        <Link href="/report" aria-current={reportActive ? "page" : undefined}>
          <span className="mk-nav__pill">
            <BarChart3 />
          </span>
          รายงาน
        </Link>
        <Link href="/admin" aria-current={adminActive ? "page" : undefined}>
          <span className="mk-nav__pill">
            <SlidersHorizontal />
          </span>
          จัดการ
        </Link>
      </nav>

      <BillTypeSheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        onSelect={handleSelectType}
      />
    </>
  );
}
