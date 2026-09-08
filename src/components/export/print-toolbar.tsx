"use client";

import Link from "next/link";
import { ChevronLeft, Printer } from "lucide-react";

export default function PrintToolbar({
  title,
  pagesLabel,
}: {
  title: string;
  pagesLabel: string;
}) {
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
      <button
        type="button"
        onClick={() => window.print()}
        className="flex flex-none items-center gap-1.5 bg-accent px-3.5 py-2.5 text-[12.5px] font-bold whitespace-nowrap"
      >
        <Printer size={15} />
        พิมพ์ / PDF
      </button>
    </div>
  );
}
