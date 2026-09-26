"use client";

import { useRouter } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import type { ReactNode } from "react";
import PrintButton from "@/components/export/print-button";

// "‹ ปิด" goes back to whichever screen opened the document (bill detail or
// the bill list) instead of always home (spec §7 #13). A document opened
// fresh — e.g. handed to Safari from LINE — has nothing to go back to, so
// it falls back to the bill list.
function useClose() {
  const router = useRouter();
  return () => {
    if (window.history.length > 1) router.back();
    else router.push("/");
  };
}

export function DocumentToolbar({
  title,
  pagesLabel,
  action,
}: {
  title: string;
  pagesLabel: string;
  action: ReactNode;
}) {
  const close = useClose();
  return (
    <div className="mk sticky top-0 z-10 flex items-center gap-2 border-b border-line bg-surface py-2 pr-2 pl-1 print:hidden">
      <button type="button" onClick={close} className="mk-back">
        <ChevronLeft />
        ปิด
      </button>
      <div className="min-w-0 flex-1">
        <div className="truncate text-[15px] leading-5 font-bold">{title}</div>
        <div className="mk-caption num">{pagesLabel}</div>
      </div>
      {action}
    </div>
  );
}

export default function PrintToolbar({
  title,
  pagesLabel,
}: {
  title: string;
  pagesLabel: string;
}) {
  return (
    <DocumentToolbar
      title={title}
      pagesLabel={pagesLabel}
      action={<PrintButton />}
    />
  );
}
