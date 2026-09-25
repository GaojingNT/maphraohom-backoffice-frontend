"use client";

import type { ReactNode } from "react";
import { createPortal } from "react-dom";

// Renders a full-screen overlay (bottom sheet, lightbox, confirm dialog)
// directly under <body>. Pages animate in with a transform/opacity
// (riseIn), which turns their wrapper into the containing block and
// stacking context for anything `position: fixed` inside — without this,
// an overlay only covers the page column and sits *under* the fixed bottom
// nav, hiding its buttons.
//
// Overlays are only ever opened by a user action, after hydration, so
// `document` always exists when this renders.
export default function OverlayPortal({ children }: { children: ReactNode }) {
  if (typeof document === "undefined") return null;
  return createPortal(children, document.body);
}
