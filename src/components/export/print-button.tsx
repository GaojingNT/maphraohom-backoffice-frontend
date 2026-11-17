"use client";

import { useState, useSyncExternalStore } from "react";
import { Download, ExternalLink, Image as ImageIcon, Printer } from "lucide-react";
import {
  detectInAppBrowser,
  externalBrowserUrl,
  type InAppBrowser,
} from "@/lib/in-app-browser";
import {
  buildA4Images,
  buildA4Pdf,
  collectSheets,
  deliverFiles,
  deliverPdf,
  imageFileNames,
} from "@/lib/export/pdf";
import { useToast } from "@/components/toast-provider";

// The user agent never changes, so there's nothing to subscribe to.
const subscribe = () => () => {};
const getSnapshot = (): InAppBrowser => detectInAppBrowser(navigator.userAgent);
// On the server (and during hydration) render the normal buttons; the
// client swaps them right after if it's running inside an in-app browser.
const getServerSnapshot = (): InAppBrowser => null;

type PdfState =
  | { kind: "idle" }
  | { kind: "building" }
  // Built, but the browser wanted a fresh tap before sharing it.
  | { kind: "ready"; blob: Blob };

type ImageState =
  | { kind: "idle" }
  | { kind: "building" }
  | { kind: "ready"; blobs: Blob[] };

// The export toolbars' actions. "บันทึก PDF" builds the A4 PDF in the
// browser (lib/export/pdf.ts) so every device gets one bill per page — iOS
// Safari's print dialog ignores our A4/no-margin page setup. "พิมพ์" stays
// for desktop printers, hidden on touch screens where printing is what
// breaks. Inside LINE/Facebook/Instagram's built-in browser neither works,
// so there it becomes a way out to the phone's real browser instead — see
// lib/in-app-browser.ts.
export default function PrintButton({
  fileName,
  ready = true,
  notReadyLabel,
}: {
  fileName: string;
  // False while images the document needs (slips, signature) are loading.
  ready?: boolean;
  notReadyLabel?: string;
}) {
  const inAppBrowser = useSyncExternalStore(
    subscribe,
    getSnapshot,
    getServerSnapshot,
  );
  const { showToast } = useToast();
  const [showHelp, setShowHelp] = useState(false);
  const [pdf, setPdf] = useState<PdfState>({ kind: "idle" });
  const [image, setImage] = useState<ImageState>({ kind: "idle" });

  const buttonClass = "mk-btn mk-btn--primary flex-none";

  if (inAppBrowser === "line") {
    return (
      <button
        type="button"
        onClick={() =>
          window.location.assign(externalBrowserUrl(window.location.href))
        }
        className={buttonClass}
      >
        <ExternalLink />
        บันทึก PDF ใน Safari/Chrome
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
          <ExternalLink />
          วิธีบันทึก PDF
        </button>
        {showHelp && (
          <div
            role="status"
            className="absolute top-full right-0 z-20 mt-2 w-[250px] rounded-md bg-surface p-3 text-[13px] leading-[1.55] text-ink shadow-raised"
          >
            แอปนี้บันทึกไฟล์จากหน้าเว็บไม่ได้ — กดเมนู <b>⋯</b> มุมขวาบน
            แล้วเลือก <b>&quot;เปิดในเบราว์เซอร์&quot;</b> (Safari / Chrome)
            จากนั้นกดบันทึก PDF อีกครั้ง
          </div>
        )}
      </div>
    );
  }

  async function deliver(blob: Blob) {
    const delivered = await deliverPdf(blob, fileName);
    setPdf(delivered ? { kind: "idle" } : { kind: "ready", blob });
  }

  async function handlePdf() {
    if (pdf.kind === "ready") {
      await deliver(pdf.blob);
      return;
    }
    const sheets = collectSheets();
    if (sheets.length === 0) return;
    setPdf({ kind: "building" });
    try {
      await deliver(await buildA4Pdf(sheets));
    } catch {
      setPdf({ kind: "idle" });
      showToast("สร้าง PDF ไม่สำเร็จ ลองใหม่อีกครั้ง");
    }
  }

  async function deliverImages(blobs: Blob[]) {
    const delivered = await deliverFiles(blobs, imageFileNames(fileName, blobs.length));
    setImage(delivered ? { kind: "idle" } : { kind: "ready", blobs });
  }

  async function handleImage() {
    if (image.kind === "ready") {
      await deliverImages(image.blobs);
      return;
    }
    const sheets = collectSheets();
    if (sheets.length === 0) return;
    setImage({ kind: "building" });
    try {
      await deliverImages(await buildA4Images(sheets));
    } catch {
      setImage({ kind: "idle" });
      showToast("สร้างรูปไม่สำเร็จ ลองใหม่อีกครั้ง");
    }
  }

  const building = pdf.kind === "building";
  const buildingImage = image.kind === "building";

  return (
    <div className="flex flex-none items-center gap-1.5">
      <button
        type="button"
        onClick={() => window.print()}
        disabled={!ready}
        aria-label="พิมพ์"
        title="พิมพ์"
        className="mk-btn mk-btn--outline w-11 flex-none px-0! pointer-coarse:hidden"
      >
        <Printer />
      </button>
      <button
        type="button"
        onClick={handleImage}
        disabled={!ready || building || buildingImage}
        aria-label={image.kind === "ready" ? "แตะเพื่อบันทึกรูป" : "บันทึกรูป"}
        title={image.kind === "ready" ? "แตะเพื่อบันทึกรูป" : "บันทึกเป็นรูปภาพ (PNG)"}
        className={`mk-btn flex-none px-0! w-11 ${image.kind === "ready" ? "mk-btn--primary" : "mk-btn--outline"}`}
      >
        {buildingImage ? <span className="mk-spin" /> : <ImageIcon />}
      </button>
      <button
        type="button"
        onClick={handlePdf}
        disabled={!ready || building || buildingImage}
        className={buttonClass}
      >
        {!ready || building ? <span className="mk-spin" /> : <Download />}
        {!ready
          ? notReadyLabel
          : building
            ? "กำลังสร้าง PDF…"
            : pdf.kind === "ready"
              ? "แตะเพื่อบันทึก PDF"
              : "บันทึก PDF"}
      </button>
    </div>
  );
}
