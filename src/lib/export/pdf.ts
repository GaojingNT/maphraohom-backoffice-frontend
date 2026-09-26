// Builds the export pages' A4 PDF in the browser instead of relying on the
// print dialog. iOS Safari ignores `@page { size: A4; margin: 0 }` and
// prints with its own paper/margins, so a 297mm sheet spills onto a second
// page there. Rendering each sheet to an image and placing it on an exact
// A4 page gives the same one-bill-per-page result on every device.
//
// Both libraries are loaded on demand — they're only needed after a tap.

const A4_WIDTH_MM = 210;
const A4_HEIGHT_MM = 297;
// Top/bottom margin on the pages a tall sheet (the summary) continues onto.
// Its first page keeps the sheet's own padding.
const CONTINUATION_MARGIN_MM = 12;
// iOS Safari refuses canvases over ~16.7M pixels; stay under it.
const MAX_CANVAS_PIXELS = 16_000_000;
const PREFERRED_SCALE = 2;
const THAI = /[฀-๿]/;

// Marks one A4 sheet on an export page.
export const PDF_PAGE_ATTR = "data-pdf-page";

// Renders a copy of the sheet outside ResponsivePageScale's transform, so
// it's captured at its real 210mm width even on a phone. The copy sits at
// the viewport's top-left behind the page (the export page's own
// background covers it) — html2canvas renders far-off-screen elements blank.
async function renderSheet(sheet: HTMLElement) {
  const { default: html2canvas } = await import("html2canvas-pro");

  const host = document.createElement("div");
  host.style.cssText =
    "position:fixed;left:0;top:0;z-index:-1;pointer-events:none;transform:none;";
  const copy = sheet.cloneNode(true) as HTMLElement;
  copy.style.boxShadow = "none";
  host.appendChild(copy);
  document.body.appendChild(host);

  // html2canvas draws letter-spaced text one character at a time, which
  // drops or misplaces Thai vowel/tone marks (ได้ → ได). Thai labels lose
  // their tracking in the PDF instead; Latin ones ("RECEIPT") keep it.
  for (const el of [copy, ...copy.querySelectorAll<HTMLElement>("*")]) {
    const spacing = getComputedStyle(el).letterSpacing;
    if (spacing !== "normal" && parseFloat(spacing) !== 0 && THAI.test(el.textContent ?? "")) {
      el.style.letterSpacing = "0";
    }
  }

  try {
    const rect = copy.getBoundingClientRect();
    // Row boundaries a page may be cut at (summary rows are break-inside-avoid).
    const cuts = [...copy.querySelectorAll<HTMLElement>(".break-inside-avoid")]
      .map((el) => el.getBoundingClientRect().top - rect.top)
      .filter((y) => y > 0)
      .sort((a, b) => a - b);

    const scale = Math.min(
      PREFERRED_SCALE,
      Math.sqrt(MAX_CANVAS_PIXELS / (rect.width * rect.height)),
    );
    const canvas = await html2canvas(copy, {
      scale,
      backgroundColor: "#ffffff",
      useCORS: true,
      logging: false,
      scrollX: 0,
      scrollY: 0,
      windowWidth: Math.ceil(rect.width),
      windowHeight: Math.ceil(rect.height),
    });
    return { canvas, cssWidth: rect.width, cssHeight: rect.height, cuts };
  } finally {
    host.remove();
  }
}

// Splits a sheet taller than one A4 page at row boundaries. Returns
// [start, end) ranges in CSS px.
function pageRanges(
  cssHeight: number,
  pageHeight: number,
  margin: number,
  cuts: number[],
): [number, number][] {
  // A sheet sized exactly to A4 can measure a hair over it.
  if (cssHeight <= pageHeight + 2) return [[0, cssHeight]];

  const ranges: [number, number][] = [];
  let start = 0;
  let first = true;
  while (start < cssHeight - 1) {
    const usable = first ? pageHeight - margin : pageHeight - 2 * margin;
    const limit = start + usable;
    if (limit >= cssHeight) {
      ranges.push([start, cssHeight]);
      break;
    }
    const cut = [...cuts].reverse().find((y) => y > start + 1 && y <= limit);
    const end = cut ?? limit;
    ranges.push([start, end]);
    start = end;
    first = false;
  }
  return ranges;
}

export async function buildA4Pdf(sheets: HTMLElement[]): Promise<Blob> {
  const { jsPDF } = await import("jspdf");
  const pdf = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait", compress: true });
  let firstPage = true;

  for (const sheet of sheets) {
    const { canvas, cssWidth, cssHeight, cuts } = await renderSheet(sheet);
    const pxPerMm = cssWidth / A4_WIDTH_MM;
    const pageHeight = A4_HEIGHT_MM * pxPerMm;
    const margin = CONTINUATION_MARGIN_MM * pxPerMm;
    const ratio = canvas.width / cssWidth;

    pageRanges(cssHeight, pageHeight, margin, cuts).forEach(([start, end], i) => {
      const top = i === 0 ? 0 : margin;
      const page = document.createElement("canvas");
      page.width = canvas.width;
      page.height = Math.round(pageHeight * ratio);
      const ctx = page.getContext("2d")!;
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, page.width, page.height);
      const sliceHeight = Math.round((end - start) * ratio);
      ctx.drawImage(
        canvas,
        0, Math.round(start * ratio), canvas.width, sliceHeight,
        0, Math.round(top * ratio), canvas.width, sliceHeight,
      );

      if (!firstPage) pdf.addPage("a4", "portrait");
      firstPage = false;
      pdf.addImage(page, "JPEG", 0, 0, A4_WIDTH_MM, A4_HEIGHT_MM, undefined, "FAST");
      page.width = page.height = 0; // free memory right away (matters on iOS)
    });

    canvas.width = canvas.height = 0;
  }

  return pdf.output("blob");
}

// Hands the finished PDF to the user: the share sheet on phones (save to
// Files, send to LINE, or print from the correct PDF), a download elsewhere.
// Returns false when the browser refused because the tap's user activation
// ran out while the PDF was building — the caller then asks for one more tap.
export async function deliverPdf(blob: Blob, fileName: string): Promise<boolean> {
  const file = new File([blob], fileName, { type: "application/pdf" });
  const touch = window.matchMedia("(pointer: coarse)").matches;

  if (touch && navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: fileName });
      return true;
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") return true; // closed the sheet
      if (err instanceof DOMException && err.name === "NotAllowedError") return false;
      // Anything else: fall through to a plain download.
    }
  }

  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
  return true;
}

export function collectSheets(): HTMLElement[] {
  return [...document.querySelectorAll<HTMLElement>(`[${PDF_PAGE_ATTR}]`)];
}
