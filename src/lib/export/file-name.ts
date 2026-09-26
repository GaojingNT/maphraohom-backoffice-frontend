// "20260926" — today's date in Thailand, for exported PDF file names.
export function pdfDateStamp(date = new Date()): string {
  return date
    .toLocaleDateString("en-CA", { timeZone: "Asia/Bangkok" })
    .replaceAll("-", "");
}
