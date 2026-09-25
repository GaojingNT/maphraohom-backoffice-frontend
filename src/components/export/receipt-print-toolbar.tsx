"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import PrintButton from "@/components/export/print-button";

export default function ReceiptPrintToolbar({
  title,
  pagesLabel,
  slipUrls,
}: {
  title: string;
  pagesLabel: string;
  slipUrls: string[];
}) {
  // Slips must finish loading before window.print() runs, or the print/PDF
  // output shows an empty slip box (ADDENDUM-export.md §6). This is a
  // subscription to an external system (image loading) with setState only
  // in its resolve callback, not synchronously in the effect body.
  const [ready, setReady] = useState(slipUrls.length === 0);

  useEffect(() => {
    if (slipUrls.length === 0) return;
    let cancelled = false;
    Promise.all(
      slipUrls.map(
        (url) =>
          new Promise<void>((resolve) => {
            const img = new Image();
            img.onload = () => resolve();
            img.onerror = () => resolve();
            img.src = url;
          }),
      ),
    ).then(() => {
      if (!cancelled) setReady(true);
    });
    return () => {
      cancelled = true;
    };
  }, [slipUrls]);

  return (
    <div className="sticky top-0 z-10 flex items-center justify-between gap-3 bg-ink px-3 py-2.5 text-white print:hidden">
      <Link
        href="/"
        className="flex flex-none items-center gap-1.5 px-1.5 py-2.5 text-[12.5px] font-semibold"
      >
        <ChevronLeft size={16} />
        ปิด
      </Link>
      <div className="min-w-0 flex-1 text-center text-[11.5px] leading-[1.3] font-semibold">
        {title}
        <div className="font-num text-[10px] font-medium opacity-70">
          {pagesLabel}
        </div>
      </div>
      <PrintButton ready={ready} notReadyLabel="กำลังโหลดสลิป…" />
    </div>
  );
}
