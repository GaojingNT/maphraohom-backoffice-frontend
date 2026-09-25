"use client";

import { useState, useSyncExternalStore } from "react";
import { ExternalLink, Printer } from "lucide-react";
import {
  detectInAppBrowser,
  externalBrowserUrl,
  type InAppBrowser,
} from "@/lib/in-app-browser";

// The user agent never changes, so there's nothing to subscribe to.
const subscribe = () => () => {};
const getSnapshot = (): InAppBrowser => detectInAppBrowser(navigator.userAgent);
// On the server (and during hydration) render the normal print button; the
// client swaps it right after if it's running inside an in-app browser.
const getServerSnapshot = (): InAppBrowser => null;

// The export toolbars' "พิมพ์ / PDF" button. Inside LINE/Facebook/Instagram's
// built-in browser window.print() does nothing, so there it becomes a way
// out to the phone's real browser instead — see lib/in-app-browser.ts.
export default function PrintButton({
  ready = true,
  notReadyLabel,
}: {
  // False while images the printout needs (slips, signature) are loading.
  ready?: boolean;
  notReadyLabel?: string;
}) {
  const inAppBrowser = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const [showHelp, setShowHelp] = useState(false);

  const buttonClass =
    "flex flex-none items-center gap-1.5 bg-accent px-3.5 py-2.5 text-[12.5px] font-bold whitespace-nowrap disabled:opacity-50";

  if (inAppBrowser === "line") {
    return (
      <button
        type="button"
        onClick={() => window.location.assign(externalBrowserUrl(window.location.href))}
        className={buttonClass}
      >
        <ExternalLink size={15} />
        พิมพ์ใน Safari/Chrome
      </button>
    );
  }

  if (inAppBrowser === "other") {
    return (
      <div className="relative flex-none">
        <button
          type="button"
          onClick={() => setShowHelp((v) => !v)}
          aria-expanded={showHelp}
          className={buttonClass}
        >
          <ExternalLink size={15} />
          วิธีพิมพ์ / PDF
        </button>
        {showHelp && (
          <div
            role="status"
            className="absolute top-full right-0 z-20 mt-2 w-[240px] bg-white p-3 text-[12px] leading-[1.55] font-medium text-ink shadow-[0_8px_28px_rgba(0,0,0,0.35)]"
          >
            แอปนี้พิมพ์จากหน้าเว็บไม่ได้ — กดเมนู <b>⋯</b> มุมขวาบน แล้วเลือก{" "}
            <b>&quot;เปิดในเบราว์เซอร์&quot;</b> (Safari / Chrome) จากนั้นกดพิมพ์อีกครั้ง
          </div>
        )}
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => window.print()}
      disabled={!ready}
      className={buttonClass}
    >
      <Printer size={15} />
      {ready ? "พิมพ์ / PDF" : notReadyLabel}
    </button>
  );
}
