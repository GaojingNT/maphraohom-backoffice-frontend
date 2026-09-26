"use client";

import { useEffect, useState } from "react";
import PrintButton from "@/components/export/print-button";
import { DocumentToolbar } from "@/components/export/print-toolbar";

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
    <DocumentToolbar
      title={title}
      pagesLabel={pagesLabel}
      action={<PrintButton ready={ready} notReadyLabel="กำลังโหลดสลิป…" />}
    />
  );
}
