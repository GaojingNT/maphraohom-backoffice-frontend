// Chat/social apps open links in their own built-in browser, and those
// silently ignore window.print() — tapping "พิมพ์ / PDF" does nothing.
//
//   "line"  — LINE. Supports a documented escape hatch: loading a URL with
//             ?openExternalBrowser=1 makes LINE hand it to the phone's
//             default browser (Safari / Chrome), where printing works.
//   "other" — Facebook, Messenger, Instagram: no such parameter, so the
//             user has to use the app's own "open in browser" menu.
export type InAppBrowser = "line" | "other" | null;

export function detectInAppBrowser(userAgent: string): InAppBrowser {
  if (/\bLine\//i.test(userAgent)) return "line";
  if (/FBAN|FBAV|FB_IAB|Instagram/i.test(userAgent)) return "other";
  return null;
}

// The current page's URL with LINE's open-in-external-browser flag set.
export function externalBrowserUrl(href: string): string {
  const url = new URL(href);
  url.searchParams.set("openExternalBrowser", "1");
  return url.toString();
}
