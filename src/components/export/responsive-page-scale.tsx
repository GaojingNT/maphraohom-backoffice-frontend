"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

// The printed page(s) inside are fixed-size A4 (210mm wide) — correct for
// printing, but wider than any phone screen, so on mobile the on-screen
// preview used to just overflow sideways (awkward to review before hitting
// print). This scales the whole preview down to fit the viewport width,
// never up (desktop stays at true size), and collapses the reserved space
// to the scaled height so there's no leftover blank gap below it either.
// The actual print/PDF output is untouched — see the "print-scale-*" rules
// in each export page's own <style> block, which reset this back to true
// size only for @media print.
export default function ResponsivePageScale({
  children,
}: {
  children: ReactNode;
}) {
  const innerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState<{
    scale: number;
    height: number;
  } | null>(null);

  useEffect(() => {
    function measure() {
      const inner = innerRef.current;
      if (!inner) return;
      const naturalWidth = inner.scrollWidth;
      const naturalHeight = inner.scrollHeight;
      if (!naturalWidth || !naturalHeight) return;
      // Leaves a small side margin (matches the outer px-4 wrapper) so the
      // scaled page doesn't touch the screen edge.
      const available = window.innerWidth - 32;
      const scale = Math.min(1, available / naturalWidth);
      setDimensions({ scale, height: naturalHeight * scale });
    }
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [children]);

  return (
    <div
      className="print-scale-outer"
      style={dimensions ? { height: dimensions.height } : undefined}
    >
      <div
        ref={innerRef}
        className="print-scale-inner"
        style={
          dimensions
            ? {
                transform: `scale(${dimensions.scale})`,
                transformOrigin: "top center",
              }
            : undefined
        }
      >
        {children}
      </div>
    </div>
  );
}
