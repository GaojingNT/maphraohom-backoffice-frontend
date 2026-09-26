// Single source of truth for bill-type-dependent copy/color — see
// implementation-prompt.md §3. Every place that needs to vary by type reads
// from here instead of branching on `type === "receipt"` locally.

export type BillType = "receipt" | "payment";

export function isValidBillType(value: unknown): value is BillType {
  return value === "receipt" || value === "payment";
}

interface BillTypeConfig {
  title: string;
  createTitle: string;
  description: string;
  /** Used for every counterparty field/label: name, address, phone. */
  partyLabel: string;
  submitLabel: string;
  editSubmitLabel: string;
  /** Signature line labels on the printed receipt, in document order. */
  signatureLabels: [string, string];
  /** Printed document title (e.g. "ใบเสร็จรับเงิน"). */
  documentTitle: string;
  documentTitleEn: string;
  /** Heading above the counterparty block on the printed document. */
  counterpartyHeading: string;
  /** Wrapper class that sets --type / --type-text / --type-100 / --type-200
   *  for the NomadKit components (see nomadkit.css). */
  theme: "is-receipt" | "is-payment";
  /** Legacy Tailwind color tokens — used by the A4 documents only. */
  color: {
    text: string;
    bg: string;
    bgSoft: string;
    bgSofter: string;
    border: string;
  };
}

export const BILL_TYPE_CONFIG: Record<BillType, BillTypeConfig> = {
  receipt: {
    title: "บิลรับเงิน",
    createTitle: "สร้างบิลรับเงิน",
    description: "รับเงินจากลูกค้า",
    partyLabel: "ลูกค้า",
    submitLabel: "บันทึกบิลรับเงิน",
    editSubmitLabel: "บันทึกการแก้ไข",
    signatureLabels: ["ผู้จ่ายเงิน", "ผู้รับเงิน / ผู้มีอำนาจลงนาม"],
    documentTitle: "ใบเสร็จรับเงิน",
    documentTitleEn: "RECEIPT",
    counterpartyHeading: "ได้รับเงินจาก",
    theme: "is-receipt",
    color: {
      text: "text-accent",
      bg: "bg-accent",
      bgSoft: "bg-accent-100",
      bgSofter: "bg-accent-200",
      border: "border-accent",
    },
  },
  payment: {
    title: "บิลจ่ายเงิน",
    createTitle: "สร้างบิลจ่ายเงิน",
    description: "จ่ายเงินให้ผู้รับเงิน",
    partyLabel: "ผู้รับเงิน",
    submitLabel: "บันทึกบิลจ่ายเงิน",
    editSubmitLabel: "บันทึกการแก้ไข",
    signatureLabels: ["ผู้รับเงิน", "ผู้จ่ายเงิน / ผู้มีอำนาจลงนาม"],
    documentTitle: "ใบสำคัญจ่าย",
    documentTitleEn: "PAYMENT VOUCHER",
    counterpartyHeading: "จ่ายเงินให้",
    theme: "is-payment",
    color: {
      text: "text-payment",
      bg: "bg-payment",
      bgSoft: "bg-payment-100",
      bgSofter: "bg-payment-200",
      border: "border-payment",
    },
  },
} as const;

export const BILL_TYPES: BillType[] = ["receipt", "payment"];
